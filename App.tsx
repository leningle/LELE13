import React, { useState, useEffect, useRef } from 'react';
import { Routine, RoutineType, Goal, AppSettings } from './types';
import { ROUTINES } from './constants';
import RoutineManager from './components/RoutineManager';
import FocusTimer from './components/FocusTimer';
import ChatInterface from './components/ChatInterface';
import LiveAssistant from './components/LiveAssistant';
import Dashboard from './components/Dashboard';
import GoalPlanner from './components/GoalPlanner';
import AgileCoach from './components/AgileCoach';
import Settings from './components/Settings';
import WorkoutTrainer from './components/WorkoutTrainer';
import SplashScreen from './components/SplashScreen';
import { LayoutDashboard, Calendar, Zap, MessageSquare, Mic, Menu, X, AlertTriangle, Target, RefreshCw, Lock, Volume2, VolumeX, Moon, Sun, Settings as SettingsIcon, LogOut, Dumbbell } from 'lucide-react';

const DEFAULT_ALARM_URL = 'https://actions.google.com/sounds/v1/alarms/beep_short.ogg';

const App: React.FC = () => {
  // Authentication State
  const [auth, setAuth] = useState<{ isAuthenticated: boolean; userName: string }>({
      isAuthenticated: false,
      userName: ''
  });

  const [activeTab, setActiveTab] = useState<'dashboard' | 'routine' | 'focus' | 'chat' | 'live' | 'goals' | 'agile' | 'settings' | 'workout'>('dashboard');
  const [currentRoutineId, setCurrentRoutineId] = useState<string>(RoutineType.MORNING_PRODUCTIVE);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // Custom Data States - Loaded from LocalStorage
  const [customRoutines, setCustomRoutines] = useState<Record<string, Routine>>(() => {
    let initial = { ...ROUTINES };
    if (typeof window !== 'undefined') {
        const saved = localStorage.getItem('equilibrio_routines');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                initial = { ...initial, ...parsed };
                // Ensure PDF_IMPORTED and EL_CAMBIO exist
                if (!parsed[RoutineType.PDF_IMPORTED]) {
                    initial[RoutineType.PDF_IMPORTED] = ROUTINES[RoutineType.PDF_IMPORTED];
                }
                if (!parsed[RoutineType.EL_CAMBIO]) {
                    initial[RoutineType.EL_CAMBIO] = ROUTINES[RoutineType.EL_CAMBIO];
                }
            } catch (e) {
                console.error("Failed to parse saved routines", e);
            }
        }
    }
    return initial;
  });

  const [goals, setGoals] = useState<Goal[]>(() => {
     const defaultGoals: Goal[] = [
         { id: 'pdf-task-1', text: 'Agendar Citas Clave (Médico y Dentista)', period: 'semanal', completed: false },
         { id: 'pdf-task-2', text: 'Comprar Ropa de Reposición', period: 'semanal', completed: false }
     ];
     if (typeof window !== 'undefined') {
        const saved = localStorage.getItem('equilibrio_goals');
        if (saved) {
            try {
                return JSON.parse(saved);
            } catch(e) {}
        }
     }
     return defaultGoals;
  });
  
  const [appSettings, setAppSettings] = useState<AppSettings>(() => {
    if (typeof window !== 'undefined') {
        const saved = localStorage.getItem('equilibrio_settings');
        if (saved) {
            try {
                return JSON.parse(saved);
            } catch (e) {
                console.error("Failed to parse saved settings", e);
            }
        }
    }
    return {
      vitaminDTime: '10:00',
      vitaminDEnabled: true,
      theme: 'light'
    };
  });
  
  const [toast, setToast] = useState<{message: string, type: 'info' | 'warning' | 'success'} | null>(null);
  const [notifiedBlocks, setNotifiedBlocks] = useState<Set<string>>(new Set());
  const [isMuted, setIsMuted] = useState(false);
  const alarmAudioRef = useRef<HTMLAudioElement | null>(null);
  const [isLocked, setIsLocked] = useState(false);
  const [currentSacredActivity, setCurrentSacredActivity] = useState('');
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    if ('Notification' in window && Notification.permission !== 'granted') {
      Notification.requestPermission();
    }
  }, []);

  useEffect(() => {
    const audioSrc = appSettings.customAlarmUrl || DEFAULT_ALARM_URL;
    if (!alarmAudioRef.current) {
        alarmAudioRef.current = new Audio(audioSrc);
        alarmAudioRef.current.volume = 0.5;
    } else {
        if (alarmAudioRef.current.src !== audioSrc) {
             alarmAudioRef.current.src = audioSrc;
             alarmAudioRef.current.load();
        }
    }
  }, [appSettings.customAlarmUrl]);

  useEffect(() => {
      localStorage.setItem('equilibrio_routines', JSON.stringify(customRoutines));
  }, [customRoutines]);

  useEffect(() => {
      localStorage.setItem('equilibrio_goals', JSON.stringify(goals));
  }, [goals]);

  useEffect(() => {
      localStorage.setItem('equilibrio_settings', JSON.stringify(appSettings));
  }, [appSettings]);

  useEffect(() => {
      if (isDarkMode) {
          document.documentElement.classList.add('dark');
      } else {
          document.documentElement.classList.remove('dark');
      }
  }, [isDarkMode]);

  useEffect(() => {
    const checkTime = () => {
      const now = new Date();
      const currentMinutes = now.getHours() * 60 + now.getMinutes();
      const dayKey = now.toDateString(); 

      const routine = customRoutines[currentRoutineId];
      if (!routine) return;

      let activeSacredBlockFound = false;
      
      routine.blocks.forEach((block, index) => {
         const [h, m] = block.time.split(':').map(Number);
         const blockStartMinutes = h * 60 + m;
         const diff = blockStartMinutes - currentMinutes;
         const nextBlock = routine.blocks[index + 1];
         let nextBlockStart = nextBlock ? parseInt(nextBlock.time.split(':')[0]) * 60 + parseInt(nextBlock.time.split(':')[1]) : blockStartMinutes + 60;
         
         if (currentMinutes >= blockStartMinutes && currentMinutes < nextBlockStart) {
             if (block.type === 'sacred') {
                 activeSacredBlockFound = true;
                 setCurrentSacredActivity(block.activity);
                 if (!isLocked) {
                     setIsLocked(true);
                     if (!isMuted) alarmAudioRef.current?.play().catch(() => {});
                 }
             }
         }

         const alarmKey = `${dayKey}-${block.time}-ALARM`;
         // Updated check: treat undefined as true (default enabled)
         if (blockStartMinutes === currentMinutes && (block.alarmEnabled !== false) && !notifiedBlocks.has(alarmKey)) {
             if (!isMuted) alarmAudioRef.current?.play().catch(() => {});
             setToast({ message: `Alarma: ${block.activity}`, type: 'info' });
             setNotifiedBlocks(prev => new Set(prev).add(alarmKey));
         }

         if (block.type === 'sacred') {
           const prevBlock = index > 0 ? routine.blocks[index-1] : null;
           const isTransitionFromWork = prevBlock?.type === 'work';

           if (diff === 15 && isTransitionFromWork) {
             const notificationKey = `${dayKey}-${block.time}-${routine.id}`;
             if (!notifiedBlocks.has(notificationKey)) {
               const message = `Aviso: Cierre de Sesión IA en 15 minutos. Tu bloque "${block.activity}" comienza pronto. Guarda tu trabajo.`;
               if (Notification.permission === 'granted') new Notification('Equilibrio IA', { body: message });
               setToast({ message, type: 'warning' });
               setNotifiedBlocks(prev => new Set(prev).add(notificationKey));
               if (!isMuted) alarmAudioRef.current?.play().catch(() => {});
             }
           }
        }
      });

      if (!activeSacredBlockFound && isLocked) {
          setIsLocked(false);
      }

      if (appSettings.vitaminDEnabled) {
          const [vH, vM] = appSettings.vitaminDTime.split(':').map(Number);
          const vMinutes = vH * 60 + vM;
          if (currentMinutes === vMinutes) {
              const vKey = `${dayKey}-VITAMIND`;
              if (!notifiedBlocks.has(vKey)) {
                   const message = "☀️ Hora de la Vitamina D: Sal a la calle por 15 minutos.";
                   if (Notification.permission === 'granted') new Notification('Equilibrio IA', { body: message });
                   setToast({ message, type: 'success' });
                   setNotifiedBlocks(prev => new Set(prev).add(vKey));
                   if (!isMuted) alarmAudioRef.current?.play().catch(() => {});
              }
          }
      }
    };

    const intervalId = setInterval(checkTime, 10000);
    checkTime();

    return () => clearInterval(intervalId);
  }, [currentRoutineId, customRoutines, notifiedBlocks, isLocked, isMuted, appSettings]);

  const addGoal = (goal: Goal) => setGoals([...goals, goal]);
  const toggleGoal = (id: string) => setGoals(goals.map(g => g.id === id ? { ...g, completed: !g.completed } : g));
  const deleteGoal = (id: string) => setGoals(goals.filter(g => g.id !== id));

  const updateRoutine = (updatedRoutine: Routine) => {
      setCustomRoutines({ ...customRoutines, [updatedRoutine.id]: updatedRoutine });
  };

  const deleteRoutine = (routineId: string) => {
    const newRoutines = { ...customRoutines };
    delete newRoutines[routineId];
    setCustomRoutines(newRoutines);
    
    if (currentRoutineId === routineId) {
        const remainingKeys = Object.keys(newRoutines);
        if (remainingKeys.length > 0) {
            setCurrentRoutineId(remainingKeys[0]);
        } else {
            setCustomRoutines(ROUTINES);
            setCurrentRoutineId(RoutineType.MORNING_PRODUCTIVE);
        }
    }
  };

  const toggleMute = () => setIsMuted(!isMuted);

  const NavButton = ({ tab, icon: Icon, label }: { tab: typeof activeTab, icon: any, label: string }) => (
    <button
      onClick={() => { setActiveTab(tab); setMobileMenuOpen(false); }}
      className={`flex items-center gap-3 px-4 py-3 rounded-lg w-full transition-colors ${
        activeTab === tab 
        ? 'bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400 font-bold' 
        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
      }`}
    >
      <Icon className="w-5 h-5" />
      <span>{label}</span>
    </button>
  );

  // If not authenticated, show Splash Screen
  if (!auth.isAuthenticated) {
      return <SplashScreen onAuthenticated={(name) => setAuth({ isAuthenticated: true, userName: name })} />;
  }

  return (
    <div className={`min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col md:flex-row relative transition-colors duration-500`}>
      
      {isLocked && (
          <div className="fixed inset-0 z-[100] bg-slate-900/95 backdrop-blur-md flex flex-col items-center justify-center text-white text-center p-8">
              <Lock className="w-24 h-24 mb-6 text-rose-500 animate-pulse" />
              <h1 className="text-4xl font-bold mb-4">Bloque Sagrado Activo</h1>
              <p className="text-2xl text-slate-300 mb-8">{currentSacredActivity}</p>
              <p className="max-w-md text-slate-400 mb-12">
                  Es momento de desconectar. Deja el trabajo y dedícate a lo que importa ahora. La aplicación está pausada para ayudarte a respetar tu tiempo.
              </p>
              <button 
                onClick={() => setIsLocked(false)}
                className="text-xs text-slate-600 hover:text-slate-400 underline"
              >
                  Desbloqueo de Emergencia
              </button>
          </div>
      )}

      {/* Mobile Header */}
      <div className="md:hidden bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 p-4 flex justify-between items-center sticky top-0 z-20">
        <h1 className="text-xl font-bold text-teal-700 dark:text-teal-400 tracking-tight">Equilibrio IA</h1>
        <div className="flex items-center gap-4">
            <button onClick={() => setIsDarkMode(!isDarkMode)} className="text-slate-600 dark:text-slate-300 p-1">
                {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            <button onClick={toggleMute} className="text-slate-600 dark:text-slate-300 p-1">
                {isMuted ? <VolumeX className="w-6 h-6" /> : <Volume2 className="w-6 h-6" />}
            </button>
            <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="p-2 text-slate-600 dark:text-slate-300">
                {mobileMenuOpen ? <X /> : <Menu />}
            </button>
        </div>
      </div>

      {/* Sidebar Navigation */}
      <aside className={`
        fixed inset-0 z-10 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 w-64 p-6 transition-transform duration-300 ease-in-out flex flex-col
        md:relative md:translate-x-0
        ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="mb-10 hidden md:block">
           <h1 className="text-2xl font-bold text-teal-700 dark:text-teal-400 tracking-tight flex items-center gap-2">
             <span className="bg-teal-600 text-white p-1 rounded">EQ</span>
             Equilibrio IA
           </h1>
           <p className="text-xs text-slate-400 mt-2">Organización Total</p>
        </div>

        {/* User Profile Snippet */}
        <div className="mb-6 pb-6 border-b border-slate-100 dark:border-slate-800 flex items-center gap-3">
             <div className="w-10 h-10 rounded-full bg-teal-100 dark:bg-teal-900/50 flex items-center justify-center text-teal-700 dark:text-teal-300 font-bold">
                 {auth.userName.charAt(0).toUpperCase()}
             </div>
             <div className="overflow-hidden">
                 <p className="text-sm font-bold text-slate-800 dark:text-white truncate">Hola, {auth.userName}</p>
                 <button onClick={() => setAuth({isAuthenticated: false, userName: ''})} className="text-xs text-slate-400 hover:text-rose-500 flex items-center gap-1">
                     <LogOut className="w-3 h-3" /> Salir
                 </button>
             </div>
        </div>

        <nav className="space-y-2 flex-1">
          <NavButton tab="dashboard" icon={LayoutDashboard} label="Día Actual" />
          <NavButton tab="workout" icon={Dumbbell} label="Entrenamiento" />
          <NavButton tab="goals" icon={Target} label="Mis Metas" />
          <NavButton tab="routine" icon={Calendar} label="Editar Rutina" />
          <NavButton tab="agile" icon={RefreshCw} label="Modo Mejora" />
          <NavButton tab="settings" icon={SettingsIcon} label="Configuración" />
          <div className="pt-4 pb-2">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-4 mb-2">Herramientas</p>
            <NavButton tab="focus" icon={Zap} label="Temporizador Foco" />
            <NavButton tab="chat" icon={MessageSquare} label="Chat Gemini" />
            <NavButton tab="live" icon={Mic} label="Voz en Vivo" />
          </div>
        </nav>

        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 mt-auto space-y-2">
            <button 
                onClick={() => setIsDarkMode(!isDarkMode)}
                className="flex items-center gap-3 px-4 py-3 rounded-lg w-full transition-colors text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
                {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                <span className="text-sm font-medium">{isDarkMode ? 'Modo Claro' : 'Modo Oscuro'}</span>
            </button>
            <button 
                onClick={toggleMute}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg w-full transition-colors ${
                    isMuted 
                    ? 'text-slate-400 bg-slate-50 dark:bg-slate-800/50' 
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
            >
                {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                <span className="text-sm font-medium">{isMuted ? 'Silenciado' : 'Sonido Activo'}</span>
            </button>
        </div>
      </aside>

      <main className="flex-1 p-4 md:p-8 overflow-y-auto h-[calc(100vh-64px)] md:h-screen relative bg-slate-50 dark:bg-slate-900 transition-colors">
        <header className="mb-8 flex justify-between items-end">
           <div>
               <h2 className="text-3xl font-bold text-slate-900 dark:text-white transition-colors">
                 {activeTab === 'dashboard' && `Tu Centro de Mando, ${auth.userName}`}
                 {activeTab === 'workout' && 'Entrenador Personal IA'}
                 {activeTab === 'goals' && 'Planificación de Metas'}
                 {activeTab === 'routine' && 'Configuración de Rutina'}
                 {activeTab === 'agile' && 'Retrospectiva Ágil'}
                 {activeTab === 'focus' && 'Modo Foco'}
                 {activeTab === 'chat' && 'Asistente IA'}
                 {activeTab === 'live' && 'Gemini Live'}
                 {activeTab === 'settings' && 'Ajustes de la App'}
               </h2>
               <p className="text-slate-500 dark:text-slate-400 mt-1 transition-colors">
                 {activeTab === 'dashboard' && 'Monitorea tu energía y sigue tu rutina en tiempo real.'}
                 {activeTab === 'workout' && 'Genera rutinas personalizadas para tus músculos.'}
                 {activeTab === 'goals' && 'Define tus objetivos anuales, mensuales y diarios.'}
                 {activeTab === 'routine' && 'Ajusta los horarios a tus turnos.'}
                 {activeTab === 'agile' && 'Una mejora al día hace la diferencia.'}
                 {activeTab === 'settings' && 'Personaliza notificaciones y recordatorios.'}
               </p>
           </div>
        </header>

        <div className="max-w-6xl mx-auto">
          {activeTab === 'dashboard' && <Dashboard stats={[]} currentRoutine={customRoutines[currentRoutineId]} />}
          
          {activeTab === 'workout' && <WorkoutTrainer />}

          {activeTab === 'goals' && (
              <GoalPlanner 
                goals={goals} 
                onAddGoal={addGoal} 
                onToggleGoal={toggleGoal} 
                onDeleteGoal={deleteGoal} 
              />
          )}

          {activeTab === 'routine' && (
            <RoutineManager 
              routines={customRoutines}
              currentRoutineId={currentRoutineId} 
              onRoutineChange={setCurrentRoutineId} 
              onUpdateRoutine={updateRoutine}
              onDeleteRoutine={deleteRoutine}
            />
          )}

          {activeTab === 'agile' && <AgileCoach />}

          {activeTab === 'settings' && (
              <Settings settings={appSettings} onUpdateSettings={setAppSettings} />
          )}

          {activeTab === 'focus' && <FocusTimer />}
          {activeTab === 'chat' && <ChatInterface />}
          {activeTab === 'live' && <LiveAssistant />}
        </div>

        {toast && (
          <div className="fixed bottom-6 right-6 z-50 animate-bounce md:animate-none">
            <div className={`p-4 rounded-xl shadow-xl border-l-4 flex items-start gap-3 max-w-sm transition-all duration-300 ${
              toast.type === 'warning' 
                ? 'bg-amber-50 dark:bg-amber-900 border-amber-500 text-amber-900 dark:text-amber-100 shadow-amber-900/10' 
                : toast.type === 'success'
                ? 'bg-orange-50 dark:bg-orange-900 border-orange-500 text-orange-900 dark:text-orange-100 shadow-orange-900/10'
                : 'bg-blue-50 dark:bg-blue-900 border-blue-500 text-blue-900 dark:text-blue-100'
            }`}>
              <div className={`p-2 rounded-full ${
                  toast.type === 'warning' ? 'bg-amber-100 dark:bg-amber-800' :
                  toast.type === 'success' ? 'bg-orange-100 dark:bg-orange-800' : 
                  'bg-blue-100 dark:bg-blue-800'
              }`}>
                {toast.type === 'warning' && <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-300" />}
                {toast.type === 'success' && <Sun className="w-5 h-5 text-orange-600 dark:text-orange-300" />}
                {toast.type === 'info' && <AlertTriangle className="w-5 h-5 text-blue-600 dark:text-blue-300" />}
              </div>
              <div className="flex-1">
                <h4 className="font-bold text-sm">
                    {toast.type === 'success' ? 'Recordatorio Salud' : 'Alerta de Rutina'}
                </h4>
                <p className="text-sm mt-1 leading-relaxed opacity-90">{toast.message}</p>
              </div>
              <button 
                onClick={() => setToast(null)} 
                className="text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 p-1 hover:bg-black/5 rounded-full transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;