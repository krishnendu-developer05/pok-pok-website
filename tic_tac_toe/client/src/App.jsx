import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { Users, Cpu, RefreshCw, Trophy, Clipboard, Copy, Wifi, WifiOff, Plus, UserPlus } from 'lucide-react';

// Connect to socket backend dynamically
const SOCKET_URL = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') ? 'http://localhost:5000' : window.location.origin;

// Funny quotes for verdicts
const defeatQuotes = [
  "{name}'s tactical genius failed to manifest.",
  "{name} brought a butter knife to a supercomputer fight.",
  "A decision that will haunt {name}'s descendants.",
  "Calculated risk, bad math. {name} is eliminated.",
  "{name} took one step and fell off the grid."
];

const drawQuotes = [
  "A hard-fought stalemate. {name} lives to type another day.",
  "The system was not defeated, but neither was {name}.",
  "A diplomatic resolution. {name} survived the machine.",
  "Perfect defense. {name} is a brick wall."
];

const winQuotes = [
  "THE IMPOSSIBLE HAS OCCURRED. {name} is the Chosen One!",
  "System breach! {name} has outsmarted the algorithm!"
];

const funnyQuotes = [
  "Probably debugging. Probably crying.",
  "Attendance: 74.9%. We live on the edge.",
  "One login away from dropping out.",
  "Gamers. Coders. Sleep deprived.",
  "Today's probability of passing: 3%.",
  "We don't need sleep, we need coffee.",
  "4 years of engineering, 40 years of trauma.",
  "The code works, but we don't know why.",
  "Ctrl+C, Ctrl+V, and Insha'Allah.",
  "Friends who fail together, stay together.",
  "WiFi > Lectures. Always.",
  "Our backup plan is also failing.",
  "GPA is just a number. A very sad number.",
  "Deadline tomorrow? Start tomorrow.",
  "We peaked in 12th grade.",
  "Hostel food built different. So did our immunity.",
  "Professor said 'easy paper'. We cried anyway.",
  "One brain cell. Shared among 5 friends.",
  "Running on caffeine, copium, and vibes.",
  "Trauma ends. GPA doesn't."
];

const CELL_CENTERS = [
  { x: 16.67, y: 16.67 }, { x: 50, y: 16.67 }, { x: 83.33, y: 16.67 },
  { x: 16.67, y: 50 },    { x: 50, y: 50 },    { x: 83.33, y: 50 },
  { x: 16.67, y: 83.33 }, { x: 50, y: 83.33 }, { x: 83.33, y: 83.33 }
];


const WIN_LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6]
];

function checkWinner(board) {
  for (let i = 0; i < WIN_LINES.length; i++) {
    const [a, b, c] = WIN_LINES[i];
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return { winner: board[a], line: WIN_LINES[i] };
    }
  }
  if (board.every(cell => cell !== null)) {
    return { winner: 'draw', line: null };
  }
  return null;
}

function minimax(board, depth, isMaximizing) {
  const res = checkWinner(board);
  if (res) {
    if (res.winner === 'O') return 10 - depth;
    if (res.winner === 'X') return depth - 10;
    if (res.winner === 'draw') return 0;
  }

  if (isMaximizing) {
    let bestScore = -Infinity;
    for (let i = 0; i < 9; i++) {
      if (board[i] === null) {
        board[i] = 'O';
        let score = minimax(board, depth + 1, false);
        board[i] = null;
        bestScore = Math.max(score, bestScore);
      }
    }
    return bestScore;
  } else {
    let bestScore = Infinity;
    for (let i = 0; i < 9; i++) {
      if (board[i] === null) {
        board[i] = 'X';
        let score = minimax(board, depth + 1, true);
        board[i] = null;
        bestScore = Math.min(score, bestScore);
      }
    }
    return bestScore;
  }
}

function getBestMove(board, player) {
  let bestScore = -Infinity;
  let move = -1;
  for (let i = 0; i < 9; i++) {
    if (board[i] === null) {
      board[i] = player;
      let score = minimax(board, 0, false);
      board[i] = null;
      if (score > bestScore) {
        bestScore = score;
        move = i;
      }
    }
  }
  return move;
}

export default function App() {
  // --- UI SCREENS STATE ---
  const [screen, setScreen] = useState('login'); // 'login', 'waiting', 'game'
  const [loginTab, setLoginTab] = useState('create');
  const [gameMode, setGameMode] = useState('multiplayer');
  const [currentQuote, setCurrentQuote] = useState(funnyQuotes[0]);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentQuote(prev => {
        const currentIndex = funnyQuotes.indexOf(prev);
        const nextIndex = (currentIndex + 1) % funnyQuotes.length;
        return funnyQuotes[nextIndex];
      });
    }, 800);
    return () => clearInterval(interval);
  }, []);
  const [aiDifficulty, setAiDifficulty] = useState('impossible');
  const [isAiThinking, setIsAiThinking] = useState(false);
  
  // --- FORM INPUTS ---
  const [name, setName] = useState('');
  const [player2Name, setPlayer2Name] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [joinRoomId, setJoinRoomId] = useState('');
  
  // --- GAME STATE ---
  const [roomId, setRoomId] = useState('');
  const [symbol, setSymbol] = useState(''); // 'X' or 'O'
  const [roomState, setRoomState] = useState(null);
  
  // --- UTILS STATE ---
  const [copied, setCopied] = useState(false);
  const [statusMsg, setStatusMsg] = useState('Initiating...');
  const [errorMsg, setErrorMsg] = useState('');
  const [connectionStatus, setConnectionStatus] = useState('connecting');
  const [rematchRequests, setRematchRequests] = useState([]);
  
  const socketRef = useRef(null);
  const audioCtxRef = useRef(null);

  // --- AUDIO SYNTHESIS ---
  const getAudioContext = () => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
    return audioCtxRef.current;
  };

  const playClick = () => {
    try {
      const ctx = getAudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(150, ctx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.06, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.08);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.08);
    } catch (e) {}
  };

  const playWin = () => {
    try {
      const ctx = getAudioContext();
      const now = ctx.currentTime;
      const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6 (Ascending Arpeggio)
      notes.forEach((freq, index) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + index * 0.09);
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.05, now + index * 0.09 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + index * 0.09 + 0.22);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + index * 0.09);
        osc.stop(now + index * 0.09 + 0.22);
      });
    } catch (e) {}
  };

  const playDraw = () => {
    try {
      const ctx = getAudioContext();
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(330, now);
      osc.frequency.linearRampToValueAtTime(220, now + 0.28);
      gain.gain.setValueAtTime(0.05, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.28);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(now + 0.28);
    } catch (e) {}
  };

  const playReset = () => {
    try {
      const ctx = getAudioContext();
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(100, now);
      osc.frequency.exponentialRampToValueAtTime(600, now + 0.12);
      gain.gain.setValueAtTime(0.04, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(now + 0.12);
    } catch (e) {}
  };

  // --- INITIALIZE SOCKET & URL PARAMETERS ---
  useEffect(() => {
    // Parse invite room ID from URL parameters
    const params = new URLSearchParams(window.location.search);
    const roomParam = params.get('room');
    if (roomParam) {
      setJoinRoomId(roomParam.toUpperCase());
      setLoginTab('join');
    }

    // Connect to Socket server
    const socket = io(SOCKET_URL);
    socketRef.current = socket;

    socket.on('connect', () => {
      setConnectionStatus('connected');
      setErrorMsg('');
    });

    socket.on('disconnect', () => {
      setConnectionStatus('disconnected');
    });

    socket.on('connect_error', () => {
      setConnectionStatus('disconnected');
      setErrorMsg('Server connection failed. Retrying...');
    });

    // Handle room creation response
    socket.on('roomCreated', ({ roomId, symbol, roomState }) => {
      setRoomId(roomId);
      setSymbol(symbol);
      setRoomState(roomState);
      setScreen('waiting');
      setStatusMsg('Waiting for opponent...');
    });

    // Handle room joining response
    socket.on('roomJoined', ({ symbol, roomState }) => {
      setSymbol(symbol);
      setRoomId(roomState.id);
      setRoomState(roomState);
      setScreen('waiting');
      setStatusMsg('Connection Established. Ready.');
    });

    // Handle game updates
    socket.on('roomStateUpdate', (newRoomState) => {
      
      setRoomState(prev => {
        // Play sounds on outcome trigger
        if (newRoomState.winner && (!prev || !prev.winner)) {
          if (newRoomState.winner === 'draw') {
            playDraw();
          } else {
            playWin();
          }
        } else if (!newRoomState.winner && prev && prev.winner) {
          playReset();
        }
        return newRoomState;
      });
      setRematchRequests(newRoomState.rematchRequests || []);
    });

    socket.on('statusMessage', (msg) => {
      setStatusMsg(msg);
    });

    socket.on('rematchState', ({ rematchRequests }) => {
      setRematchRequests(rematchRequests);
    });

    socket.on('errorMsg', (msg) => {
      setErrorMsg(msg);
      // Automatically clear error after 4 seconds
      setTimeout(() => setErrorMsg(''), 4000);
    });

    // Cleanup on unmount
    return () => {
      socket.disconnect();
    };
  }, []);

  
  // --- AI LOGIC ---
  useEffect(() => {
    if (gameMode === 'ai' && roomState && roomState.gameActive && roomState.turn === 'O' && !roomState.winner) {
      setIsAiThinking(true);
      const timer = setTimeout(() => {
        let bestMove = -1;
        const availableMoves = roomState.board.map((c, i) => c === null ? i : null).filter(c => c !== null);
        
        if (aiDifficulty === 'easy') {
          bestMove = availableMoves[Math.floor(Math.random() * availableMoves.length)];
        } else if (aiDifficulty === 'medium') {
          if (Math.random() > 0.5) {
            bestMove = getBestMove(roomState.board, 'O');
          } else {
            bestMove = availableMoves[Math.floor(Math.random() * availableMoves.length)];
          }
        } else {
          bestMove = getBestMove(roomState.board, 'O');
        }

        const newBoard = [...roomState.board];
        newBoard[bestMove] = 'O';
        const res = checkWinner(newBoard);
        
        setRoomState(prev => {
          // Play sounds
          if (res) {
            if (res.winner === 'draw') playDraw();
            else playWin();
          } else {
            playClick();
          }
          return {
            ...prev,
            board: newBoard,
            turn: res ? prev.turn : 'X',
            gameActive: !res,
            winner: res ? res.winner : null,
            winLine: res ? res.line : null
          };
        });
        setIsAiThinking(false);
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [roomState?.turn, roomState?.gameActive, gameMode, aiDifficulty]);

  // --- ACTIONS ---

  
  
  const handleStartOfflineGameSubmit = (e) => {
    e.preventDefault();
    playClick();
    if (!name.trim() || !player2Name.trim()) {
      setErrorMsg('Please enter both player names.');
      return;
    }
    setGameMode('offline');
    setSymbol('X'); // Local device plays as both, but we start viewing from X's perspective
    setRoomId('LOCAL');
    setRoomState({
      id: 'LOCAL',
      players: [
        { id: 'local1', name: name.trim().toUpperCase(), symbol: 'X', connected: true },
        { id: 'local2', name: player2Name.trim().toUpperCase(), symbol: 'O', connected: true }
      ],
      board: Array(9).fill(null),
      turn: 'X',
      gameActive: true,
      winner: null,
      winLine: null,
      rematchRequests: []
    });
    setScreen('game');
  };

  const handleStartAiGameSubmit = (e) => {
    e.preventDefault();
    playClick();
    if (!name.trim()) {
      setErrorMsg('Please enter your name.');
      return;
    }
    setGameMode('ai');
    setSymbol('X');
    setRoomId('AI_ROOM');
    setRoomState({
      id: 'AI_ROOM',
      players: [
        { id: 'local', name: name.trim().toUpperCase(), symbol: 'X', connected: true },
        { id: 'ai', name: `AI (${aiDifficulty.toUpperCase()})`, symbol: 'O', connected: true }
      ],
      board: Array(9).fill(null),
      turn: 'X',
      gameActive: true,
      winner: null,
      winLine: null,
      rematchRequests: []
    });
    setScreen('game');
  };

  const handleCreateRoomSubmit = (e) => {
    e.preventDefault();
    playClick();
    if (!name.trim() || !email.trim() || !phone.trim()) {
      setErrorMsg('Please fill in all registration fields.');
      return;
    }
    socketRef.current.emit('createRoom', { name, email, phone });
  };

  const handleJoinRoomSubmit = (e) => {
    e.preventDefault();
    playClick();
    if (!name.trim()) {
      setErrorMsg('Please enter your name.');
      return;
    }
    const targetRoomId = joinRoomId.trim().toUpperCase();
    if (!targetRoomId) {
      setErrorMsg('Room ID is required.');
      return;
    }
    socketRef.current.emit('joinRoom', { roomId: targetRoomId, name });
  };

  const handleCellClick = (cellIndex) => {
    if (!roomState || !roomState.gameActive || roomState.board[cellIndex] !== null || isAiThinking) return;
    
    // Check if it is my turn
    if (roomState.turn !== symbol && gameMode !== 'offline') return;

    playClick();

    if (gameMode === 'ai' || gameMode === 'offline') {
      const currentTurnSymbol = roomState.turn;
      const nextTurnSymbol = currentTurnSymbol === 'X' ? 'O' : 'X';
      
      // For offline mode, both players click on the same device, so we just use the current turn's symbol
      const moveSymbol = gameMode === 'offline' ? currentTurnSymbol : symbol;
      
      const newBoard = [...roomState.board];
      newBoard[cellIndex] = moveSymbol;
      const res = checkWinner(newBoard);
      
      setRoomState(prev => {
        if (res) {
          if (res.winner === 'draw') playDraw();
          else playWin();
        }
        return {
          ...prev,
          board: newBoard,
          turn: res ? prev.turn : nextTurnSymbol,
          gameActive: !res,
          winner: res ? res.winner : null,
          winLine: res ? res.line : null
        };
      });
      
      // If AI mode, we stop here and let the useEffect handle AI's turn
      if (gameMode === 'ai' && !res) return;
    } else if (gameMode === 'multiplayer') {
      socketRef.current.emit('makeMove', { roomId, cellIndex });
    }
  };

  const handleCopyLink = () => {
    const inviteLink = `${window.location.origin}?room=${roomId}`;
    navigator.clipboard.writeText(inviteLink).then(() => {
      setCopied(true);
      playClick();
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleRequestRematch = () => {
    playClick();
    if (gameMode === 'ai' || gameMode === 'offline') {
      setRoomState(prev => ({
        ...prev,
        board: Array(9).fill(null),
        turn: 'X',
        gameActive: true,
        winner: null,
        winLine: null,
        rematchRequests: []
      }));
    } else {
      socketRef.current.emit('requestRematch', { roomId });
    }
  };

  const handleCreateNewRoom = () => {
    playClick();
    // Reset browser address bar and redirect to home screen
    window.history.pushState({}, document.title, window.location.pathname);
    setLoginTab('create');
    setRoomState(null);
    setRoomId('');
    setSymbol('');
    setScreen('login');
  };

  // --- ACCESSIBILITY KEYBOARD NAVIGATION ---
  const handleCellKeyDown = (e, index) => {
    let targetIndex = null;
    const row = Math.floor(index / 3);
    const col = index % 3;

    switch (e.key) {
      case 'ArrowLeft':
        targetIndex = row * 3 + ((col - 1 + 3) % 3);
        break;
      case 'ArrowRight':
        targetIndex = row * 3 + ((col + 1) % 3);
        break;
      case 'ArrowUp':
        targetIndex = ((row - 1 + 3) % 3) * 3 + col;
        break;
      case 'ArrowDown':
        targetIndex = ((row + 1) % 3) * 3 + col;
        break;
      case ' ':
      case 'Enter':
        e.preventDefault();
        handleCellClick(index);
        break;
    }

    if (targetIndex !== null) {
      e.preventDefault();
      const nextCell = document.querySelector(`[data-index="${targetIndex}"]`);
      if (nextCell) nextCell.focus();
    }
  };

  // Helper variables
  const isMyTurn = roomState && roomState.gameActive && roomState.turn === symbol;
  const player1 = roomState ? roomState.players[0] : null;
  const player2 = roomState && roomState.players.length > 1 ? roomState.players[1] : null;
  
  const opponent = roomState 
    ? roomState.players.find(p => p.symbol !== symbol) 
    : null;

  // Generate localized quote values
  const getVerdictQuote = () => {
    if (!roomState || !roomState.winner) return '';
    if (roomState.winner === 'draw') {
      const nameString = `${player1?.name} & ${player2?.name}`;
      return drawQuotes[0].replace(/{name}/g, nameString);
    }
    const winnerName = roomState.winner === 'X' ? player1?.name : player2?.name;
    if (roomState.winner === symbol) {
      return winQuotes[Math.floor(Math.random() * winQuotes.length)].replace(/{name}/g, winnerName);
    } else {
      return defeatQuotes[Math.floor(Math.random() * defeatQuotes.length)].replace(/{name}/g, symbol === 'X' ? player1?.name : player2?.name);
    }
  };

  return (
    <div className="relative min-h-screen flex flex-col lg:flex-row overflow-hidden text-slate-200">
      
      {/* Floating Background Neon Glow Blobs */}
      <div className="glow-blob glow-blob-1"></div>
      <div className="glow-blob glow-blob-2"></div>
      <div className="glow-blob glow-blob-3"></div>

      {/* ===== LEFT BRANDING PANEL — Desktop only ===== */}
      <aside className="hidden lg:flex flex-col justify-between flex-1 min-h-screen px-14 py-12 relative z-10 border-r border-white/5">
        {/* Top: Club badge */}
        <div>
          <div className="inline-flex items-center gap-2.5 bg-white/5 border border-white/10 px-4 py-2 rounded-full text-xs font-bold text-indigo-300 tracking-widest uppercase mb-10">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
            </svg>
            CHAOS POKERS PRESENT
          </div>

          <h1 className="text-6xl xl:text-7xl font-black tracking-tight leading-none mb-4 game-title">
            TIC TAC TOE
          </h1>
          <p className="text-slate-400 text-lg font-medium mb-2">Real-Time Casino Multiplayer</p>
          <p className="text-amber-400 text-sm font-bold italic min-h-[1.4rem] transition-all duration-300">
            &ldquo;{currentQuote}&rdquo;
          </p>
        </div>

        {/* Middle: Decorative animated tic-tac-toe grid */}
        <div className="my-auto py-10">
          <div className="grid grid-cols-3 gap-3 w-56 xl:w-64 mx-auto">
            {['X','O','X','O','X','O','X','O','X'].map((sym, i) => (
              <div
                key={i}
                className="aspect-square rounded-2xl flex items-center justify-center"
                style={{
                  background: 'rgba(255,255,255,0.025)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  animation: `slide-up-fade 0.5s cubic-bezier(0.16,1,0.3,1) forwards`,
                  animationDelay: `${i * 0.07}s`,
                  opacity: 0
                }}
              >
                {sym === 'X' ? (
                  <svg className="w-8 h-8 xl:w-10 xl:h-10 text-cyan-neon symbol-breathe" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <line x1="18" y1="6" x2="6" y2="18"/>
                    <line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                ) : (
                  <svg className="w-8 h-8 xl:w-10 xl:h-10 text-rose-neon symbol-breathe" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <circle cx="12" cy="12" r="10"/>
                  </svg>
                )}
              </div>
            ))}
          </div>
          {/* Diagonal win line overlay */}
          <div className="flex justify-center mt-4">
            <span className="text-[10px] font-black tracking-widest text-slate-500 uppercase">Real-time · AI · Local · Offline</span>
          </div>
        </div>

        {/* Bottom: Stats row */}
        <div className="flex gap-8">
          <div>
            <div className="text-2xl font-black game-title">∞</div>
            <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Rounds</div>
          </div>
          <div>
            <div className="text-2xl font-black" style={{color:'var(--color-x)'}}>4</div>
            <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Game Modes</div>
          </div>
          <div>
            <div className="text-2xl font-black" style={{color:'var(--color-o)'}}>0ms</div>
            <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Lag</div>
          </div>
        </div>
      </aside>

      {/* ===== RIGHT GAME PANEL ===== */}
      <main className="relative z-10 w-[90%] max-w-[420px] mx-auto lg:w-[45%] lg:max-w-[520px] lg:mx-0 px-2 lg:px-10 py-4 sm:py-8 flex flex-col justify-between items-center min-h-screen select-none fade-in">
        
        {/* Error Toast Message */}
        {errorMsg && (
          <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 glass-panel border-red-500/25 text-red-400 text-xs font-semibold px-5 py-3 rounded-full flex items-center gap-2 shadow-2xl transition-all duration-300">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
            {errorMsg}
          </div>
        )}

        {/* Global Connection Badge Status */}
        <div className="fixed top-6 right-6 z-40 glass-panel px-3 py-1 rounded-full text-[10px] font-bold flex items-center gap-1.5 border-white/5 shadow-md">
          {connectionStatus === 'connected' ? (
            <>
              <Wifi className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-emerald-400 uppercase">ONLINE</span>
            </>
          ) : (
            <>
              <WifiOff className="w-3.5 h-3.5 text-rose-400" />
              <span className="text-rose-400 uppercase">DISCONNECTED</span>
            </>
          )}
        </div>

        {/* Header Section — mobile only, hidden on desktop where left panel shows it */}
        <header className="w-full flex flex-col items-center text-center mb-4 lg:hidden">
          <div className="inline-flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/25 px-3.5 py-1 rounded-full text-xs font-bold text-indigo-400 tracking-wider uppercase mb-3 shadow-glow-purple">
            <svg className="w-3.5 h-3.5 text-indigo-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
            </svg>
            CHAOS POKERS PRESENT
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight mb-1 font-outfit game-title">
            TIC TAC TOE
          </h1>
          <p className="text-sm text-slate-400 font-medium">Real-Time Casino Multiplayer</p>
          <div className="text-xs text-amber-400 font-bold italic mt-1.5 min-h-[1.2rem] tracking-wide transition-all duration-300">
            &ldquo;{currentQuote}&rdquo;
          </div>
        </header>

        {/* Desktop-only compact header for right panel */}
        <header className="w-full hidden lg:flex flex-col items-start text-left mb-6">
          <h2 className="text-2xl font-black text-white tracking-tight">Game Lobby</h2>
          <p className="text-xs text-slate-500 font-medium mt-0.5">Pick a mode &amp; enter the arena</p>
        </header>

        {/* --- SCREEN 1: LOGIN / JOIN FORM --- */}
        {screen === 'login' && (
          <section className="w-full flex flex-col gap-5 my-auto scale-in">
            
            {/* Segmented Mode Button selectors */}
            <div className="glass-panel p-1 rounded-xl flex w-full relative">
              <button 
                type="button"
                onClick={() => { playClick(); setLoginTab('create'); }}
                className={`flex-1 py-2.5 text-[10px] sm:text-xs font-bold rounded-lg transition-all duration-300 z-10 segment-btn ${loginTab === 'create' ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'}`}
              >
                CREATE
              </button>
              <button 
                type="button"
                onClick={() => { playClick(); setLoginTab('join'); }}
                className={`flex-1 py-2.5 text-[10px] sm:text-xs font-bold rounded-lg transition-all duration-300 z-10 segment-btn ${loginTab === 'join' ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'}`}
              >
                JOIN
              </button>
              <button 
                type="button"
                onClick={() => { playClick(); setLoginTab('ai'); }}
                className={`flex-1 py-2.5 text-[10px] sm:text-xs font-bold rounded-lg transition-all duration-300 z-10 segment-btn ${loginTab === 'ai' ? 'bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'}`}
              >
                VS AI
              </button>
              <button 
                type="button"
                onClick={() => { playClick(); setLoginTab('offline'); }}
                className={`flex-1 py-2.5 text-[10px] sm:text-xs font-bold rounded-lg transition-all duration-300 z-10 segment-btn ${loginTab === 'offline' ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'}`}
              >
                OFFLINE
              </button>
            </div>

            {/* Registration Form container */}
            <div className="glass-panel p-6 rounded-3xl border border-indigo-500/10 shadow-glow-purple">
                            <h2 className="text-lg font-black text-white mb-1 tracking-tight font-outfit uppercase">
                {loginTab === 'join' ? 'Join Game Session' : loginTab === 'ai' ? 'Play Against AI' : loginTab === 'offline' ? 'Local Offline Match' : 'Initiate Game Lobbies'}
              </h2>
              <p className="text-xs text-slate-400 mb-6 leading-relaxed">
                {loginTab === 'join' 
                  ? 'Enter your name to connect to your opponent\'s multiplayer room.' 
                  : loginTab === 'ai'
                    ? 'Select your difficulty level and face the supercomputer.'
                    : loginTab === 'offline'
                      ? 'Pass the phone to play locally with a friend.'
                      : 'Register your legal credentials to allocate a unique game room.'}
              </p>

              {loginTab === 'create' && (
                // CREATE ROOM FORM
                <form onSubmit={handleCreateRoomSubmit} className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-bold text-cyan-400 tracking-wider uppercase mb-1.5">Player Legal Name</label>
                    <input 
                      type="text" 
                      required 
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Enter Full Name" 
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all text-center"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-indigo-400 tracking-wider uppercase mb-1.5">Email Address</label>
                    <input 
                      type="email" 
                      required 
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@domain.com" 
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all text-center"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-indigo-400 tracking-wider uppercase mb-1.5">Phone Number</label>
                    <input 
                      type="tel" 
                      required 
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+91 XXXXX XXXXX" 
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all text-center"
                    />
                  </div>
                  <button 
                    type="submit" 
                    className="w-full bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold py-3 rounded-xl transition-all shadow-glow-purple tracking-wider uppercase font-outfit mt-2"
                  >
                    ALLOT ROOM
                  </button>
                </form>
              )}
              {loginTab === 'join' && (
                // JOIN ROOM FORM
                <form onSubmit={handleJoinRoomSubmit} className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-bold text-cyan-400 tracking-wider uppercase mb-1.5">Your Name</label>
                    <input 
                      type="text" 
                      required 
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Enter Full Name" 
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all text-center"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-rose-400 tracking-wider uppercase mb-1.5">Room ID Code</label>
                    <input 
                      type="text" 
                      required 
                      value={joinRoomId}
                      onChange={(e) => setJoinRoomId(e.target.value.toUpperCase())}
                      placeholder="6-DIGIT CODE" 
                      maxLength="6"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all text-center tracking-widest uppercase"
                    />
                  </div>
                  <button 
                    type="submit" 
                    className="w-full bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold py-3 rounded-xl transition-all shadow-glow-purple tracking-wider uppercase font-outfit mt-2"
                  >
                    ESTABLISH CONNECTION
                  </button>
                </form>
              )}
              {loginTab === 'ai' && (
                // AI ROOM FORM
                <form onSubmit={handleStartAiGameSubmit} className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-bold text-cyan-400 tracking-wider uppercase mb-1.5">Your Name</label>
                    <input 
                      type="text" 
                      required 
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Enter Full Name" 
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all text-center"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-indigo-400 tracking-wider uppercase mb-1.5">Select Difficulty</label>
                    <select 
                      value={aiDifficulty}
                      onChange={(e) => setAiDifficulty(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all text-center appearance-none cursor-pointer"
                    >
                      <option value="easy" className="bg-slate-900">Easy (Random)</option>
                      <option value="medium" className="bg-slate-900">Medium (Mixed)</option>
                      <option value="impossible" className="bg-slate-900">Impossible (Minimax)</option>
                    </select>
                  </div>
                  <button 
                    type="submit" 
                    className="w-full bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold py-3 rounded-xl transition-all shadow-glow-purple tracking-wider uppercase font-outfit mt-2"
                  >
                    START MATCH
                  </button>
                </form>
              )}

              {loginTab === 'offline' && (
                // OFFLINE ROOM FORM
                <form onSubmit={handleStartOfflineGameSubmit} className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-bold text-cyan-400 tracking-wider uppercase mb-1.5">Player 1 Name (X)</label>
                    <input 
                      type="text" 
                      required 
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Enter Player 1 Name" 
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all text-center"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-rose-400 tracking-wider uppercase mb-1.5">Player 2 Name (O)</label>
                    <input 
                      type="text" 
                      required 
                      value={player2Name}
                      onChange={(e) => setPlayer2Name(e.target.value)}
                      placeholder="Enter Player 2 Name" 
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 transition-all text-center"
                    />
                  </div>
                  <button 
                    type="submit" 
                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold py-3 rounded-xl transition-all shadow-glow-purple tracking-wider uppercase font-outfit mt-2"
                  >
                    START LOCAL MATCH
                  </button>
                </form>
              )}

            </div>
          </section>
        )}

        {/* --- SCREEN 2: WAITING ROOM --- */}
        {screen === 'waiting' && (
          <section className="w-full flex flex-col gap-6 my-auto scale-in text-center items-center">
            
            {/* Spinning radar visual element */}
            <div className="w-20 h-20 rounded-full border-2 border-indigo-500/20 border-t-indigo-500 flex items-center justify-center animate-spin mb-2 shadow-glow-purple">
              <Users className="w-8 h-8 text-indigo-400 animate-pulse" />
            </div>

            <div className="glass-panel p-6 rounded-3xl w-full border border-indigo-500/10 shadow-glow-purple">
              <h2 className="text-xl font-black text-white mb-1 tracking-tight font-outfit uppercase">
                Room Allocated
              </h2>
              <p className="text-xs text-indigo-400 animate-pulse font-semibold uppercase tracking-wider mb-6">
                {statusMsg}
              </p>

              {/* Room Info */}
              <div className="bg-white/5 border border-white/10 rounded-2xl p-4 mb-6 flex flex-col gap-3">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 block mb-0.5">ROOM ID CODE</span>
                  <span className="text-2xl font-black text-white tracking-widest font-outfit">{roomId}</span>
                </div>
              </div>

              {/* If opponent joined, show Enter Game button, else show copy link */}
              {roomState && roomState.players.length === 2 ? (
                <button 
                  onClick={() => { playClick(); setScreen('game'); }}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold py-3.5 rounded-xl transition-all shadow-glow-purple tracking-wider uppercase mt-2 animate-pulse"
                >
                  ENTER THE GAME
                </button>
              ) : (
                <div className="flex flex-col gap-2">
                  <span className="text-[10px] font-bold text-slate-400 text-left block">INVITATION SHARING LINK</span>
                  <div className="flex gap-2 w-full">
                    <input 
                      type="text" 
                      readOnly 
                      value={`${window.location.origin}?room=${roomId}`}
                      className="flex-1 bg-black/30 border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-400 focus:outline-none truncate"
                    />
                    <button 
                      onClick={handleCopyLink}
                      className="glass-panel glass-panel-interactive px-4 rounded-xl flex items-center justify-center gap-1.5 text-xs font-bold text-slate-200"
                      aria-label="Copy invitation link"
                    >
                      {copied ? (
                        <span className="text-emerald-400 font-bold">COPIED</span>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>COPY</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>

            <button 
              onClick={handleCreateNewRoom}
              className="text-xs text-slate-400 hover:text-slate-200 tracking-wider font-semibold border-b border-dashed border-slate-500 pb-0.5 mt-4 uppercase"
            >
              Cancel Lobby
            </button>
          </section>
        )}

        {/* --- SCREEN 3: GAMEPLAY BOARD --- */}
        {screen === 'game' && roomState && (
          <section className="w-full flex flex-col items-center scale-in my-auto">
            
            {/* Lobbies Panel status header */}
            <div className="w-full glass-panel px-4 py-2.5 rounded-2xl flex items-center justify-between mb-6 border-white/5 shadow-md">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">ROOM: {roomId}</span>
              </div>
              <div className="flex gap-4">
                {/* Player 1 Connection Status */}
                <div className="flex items-center gap-1">
                  <span className={`w-1.5 h-1.5 rounded-full ${player1?.connected ? 'bg-emerald-400' : 'bg-rose-400 animate-pulse'}`}></span>
                  <span className="text-[9px] font-black text-slate-300 max-w-[50px] truncate">{player1?.name} (X)</span>
                </div>
                {/* Player 2 Connection Status */}
                <div className="flex items-center gap-1">
                  <span className={`w-1.5 h-1.5 rounded-full ${player2?.connected ? 'bg-emerald-400' : 'bg-rose-400 animate-pulse'}`}></span>
                  <span className="text-[9px] font-black text-slate-300 max-w-[50px] truncate">{player2 ? `${player2.name} (O)` : 'WAITING'}</span>
                </div>
              </div>
            </div>

            {/* Turn indication slider OR Rematch Button */}
            {roomState.gameActive ? (
              <div className="glass-panel px-1 py-1 rounded-full flex w-52 sm:w-60 relative overflow-hidden mb-4 sm:mb-6">
                {/* Background Slider Pill */}
                <div 
                  className="absolute top-1 left-1 bottom-1 w-[calc(50%-4px)] rounded-full turn-pill-active shadow-md"
                  style={{
                    transform: roomState.turn === 'X' ? 'translateX(0%)' : 'translateX(100%)',
                    backgroundColor: roomState.turn === 'X' ? 'var(--color-x)' : 'var(--color-o)'
                  }}
                ></div>
                
                {/* Labels */}
                <div className={`flex-1 text-center py-1.5 text-[10px] sm:text-xs font-bold z-10 transition-colors duration-300 cursor-default truncate px-2 ${roomState.turn === 'X' ? 'text-white' : 'text-slate-400'}`}>
                  {player1 ? `${player1.name.split(' ')[0]}'S TURN` : 'X TURN'}
                </div>
                <div className={`flex-1 text-center py-1.5 text-[10px] sm:text-xs font-bold z-10 transition-colors duration-300 cursor-default truncate px-2 ${roomState.turn === 'O' ? 'text-white' : 'text-slate-400'}`}>
                  {player2 ? `${player2.name.split(' ')[0]}'S TURN` : 'O TURN'}
                </div>
              </div>
            ) : (
              <button 
                onClick={handleRequestRematch}
                disabled={rematchRequests.includes(socketRef.current?.id)}
                className="w-52 sm:w-60 bg-indigo-600 hover:bg-indigo-500 text-white px-2 py-2 sm:py-2.5 rounded-full flex items-center justify-center gap-2 text-xs sm:text-sm font-black shadow-glow-purple mb-4 sm:mb-6 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed animate-pulse"
                aria-label="Request Rematch"
              >
                <RefreshCw className={`w-4 h-4 sm:w-5 sm:h-5 ${rematchRequests.includes(socketRef.current?.id) ? 'animate-spin' : ''}`} />
                {rematchRequests.includes(socketRef.current?.id) 
                  ? 'WAITING...' 
                  : rematchRequests.length > 0 
                    ? 'ACCEPT REMATCH'
                    : 'REQUEST REMATCH'}
              </button>
            )}

            {/* Main Game Board Panel */}
            <div className="relative w-full max-w-full sm:max-w-[420px] aspect-square glass-panel glass-panel-glow rounded-3xl p-2 sm:p-3 mb-4 sm:mb-6 shadow-glow-purple">
              
              {/* SVG winning line overlay */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none z-20">
                {roomState.winner && roomState.winLine && (
                  <line 
                    x1={`${CELL_CENTERS[roomState.winLine[0]].x}%`}
                    y1={`${CELL_CENTERS[roomState.winLine[0]].y}%`}
                    x2={`${CELL_CENTERS[roomState.winLine[2]].x}%`}
                    y2={`${CELL_CENTERS[roomState.winLine[2]].y}%`}
                    stroke={roomState.winner === 'X' ? 'var(--color-x)' : 'var(--color-o)'}
                    strokeWidth="5"
                    strokeLinecap="round"
                    className="winning-line-path"
                    style={{
                      filter: `drop-shadow(0 0 15px ${roomState.winner === 'X' ? 'rgba(6, 182, 212, 0.6)' : 'rgba(244, 63, 94, 0.6)'})`
                    }}
                  />
                )}
              </svg>

              {/* Opponent Connection drop alert overlay */}
              {opponent && !opponent.connected && (
                <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/80 backdrop-blur-sm rounded-[22px] scale-in">
                  <div className="text-center p-6">
                    <div className="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center mx-auto mb-4 text-rose-400 animate-pulse shadow-glow-rose">
                      <WifiOff className="w-6 h-6" />
                    </div>
                    <h3 className="text-sm font-black text-white uppercase tracking-wider mb-1">CONNECTION INTERRUPTED</h3>
                    <p className="text-xs text-slate-400 max-w-[200px] mx-auto leading-relaxed">
                      {opponent.name} disconnected. Waiting for recovery...
                    </p>
                  </div>
                </div>
              )}

              {/* Post-game Verdict Stamp Overlay */}
              {roomState.winner && (
                <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/75 backdrop-blur-sm rounded-[22px] scale-in">
                  <div className="text-center p-6">
                    <div 
                      id="verdict-stamp" 
                      className={`inline-block border-[3px] sm:border-4 px-4 sm:px-6 py-1.5 sm:py-2 rounded-xl text-base sm:text-xl font-black tracking-widest uppercase mb-2 sm:mb-4 transform -rotate-12 ${
                        roomState.winner === 'draw' 
                          ? 'border-slate-400 text-slate-400 shadow-[0_0_20px_rgba(148,163,184,0.35)]'
                          : roomState.winner === symbol 
                            ? 'border-emerald-500 text-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.4)]'
                            : 'border-rose-500 text-rose-500 shadow-[0_0_20px_rgba(244,63,94,0.4)]'
                      }`}
                    >
                      {roomState.winner === 'draw' 
                        ? 'VERDICT: DRAW' 
                        : roomState.winner === symbol 
                          ? 'VERDICT: VICTORY' 
                          : 'VERDICT: DEFEAT'}
                    </div>
                    <p id="verdict-quote" className="text-xs text-slate-300 italic max-w-[240px] mx-auto leading-relaxed">
                      {getVerdictQuote()}
                    </p>
                  </div>
                </div>
              )}

              {/* 3x3 cells grid */}
              <div 
                className="grid grid-cols-3 grid-rows-3 gap-3 w-full h-full" 
                role="grid" 
                aria-label="Tic Tac Toe Board"
                data-turn={roomState.turn}
              >
                {roomState.board.map((cell, idx) => (
                  <button
                    key={idx}
                    data-index={idx}
                    onClick={() => handleCellClick(idx)}
                    onKeyDown={(e) => handleCellKeyDown(e, idx)}
                    tabIndex={roomState.gameActive && !isAiThinking ? 0 : -1}
                    className={`cell flex items-center justify-center rounded-2xl select-none focus:outline-none ${
                      cell === null 
                        ? 'cell-empty cursor-pointer' 
                        : 'cursor-not-allowed'
                    } ${
                      roomState.winLine && roomState.winLine.includes(idx)
                        ? roomState.winner === 'X' 
                          ? 'winning-cell-x' 
                          : 'winning-cell-o'
                        : ''
                    }`}
                    aria-label={`Cell ${idx + 1}, ${cell === null ? 'empty' : cell}`}
                  >
                    {cell === 'X' && (
                      <svg className="w-12 h-12 sm:w-16 sm:h-16 text-cyan-neon scale-in symbol-breathe" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                      </svg>
                    )}
                    {cell === 'O' && (
                      <svg className="w-12 h-12 sm:w-16 sm:h-16 text-rose-neon scale-in symbol-breathe" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="12" cy="12" r="10" />
                      </svg>
                    )}
                  </button>
                ))}
              </div>

            </div>

            {/* Status message box */}
            <div className="text-center h-6 mb-6" aria-live="polite">
              <span className="text-xs font-semibold tracking-wide text-slate-300 uppercase transition-all duration-300">
                {roomState.gameActive ? (
                  (isMyTurn || gameMode === "offline") ? (
                    <span className="text-indigo-400 animate-pulse font-bold">YOUR MOVE</span>
                  ) : (
                    <span>WAITING FOR OPPONENT...</span>
                  )
                ) : (
                  <span className="text-indigo-400 font-bold uppercase">MATCH CONCLUDED</span>
                )}
              </span>
            </div>

            {/* Scoreboard Section */}
            <section className="w-full grid grid-cols-3 gap-3 mb-6">
              
              {/* Creator Score Box */}
              <div id="score-box-x" className={`glass-panel score-box rounded-xl p-3 flex flex-col items-center justify-center text-center border-l-2 border-l-cyan-500 shadow-glow-cyan`}>
                <span className="text-[9px] font-bold text-cyan-400 tracking-wider uppercase mb-1 truncate max-w-[90px]">{player1?.name}</span>
                <span className="text-sm font-black text-slate-400 uppercase tracking-widest block mb-0.5">SYMBOL: X</span>
              </div>

              {/* Lobbies Stats draws */}
              <div className="glass-panel score-box rounded-xl p-3 flex flex-col items-center justify-center text-center">
                <span className="text-[9px] font-bold text-slate-400 tracking-wider uppercase mb-1">{gameMode === 'offline' ? 'CURRENT TURN' : 'YOUR SYMBOL'}</span>
                <span className={`text-lg font-black font-outfit uppercase ${(gameMode === 'offline' ? roomState.turn : symbol) === 'X' ? 'text-cyan-400 text-cyan-neon' : 'text-rose-400 text-rose-neon'}`}>
                  {gameMode === 'offline' ? roomState.turn : symbol}
                </span>
              </div>

              {/* Guest Score Box */}
              <div id="score-box-o" className={`glass-panel score-box rounded-xl p-3 flex flex-col items-center justify-center text-center border-r-2 border-r-rose-500 shadow-glow-rose`}>
                <span className="text-[9px] font-bold text-rose-400 tracking-wider uppercase mb-1 truncate max-w-[90px]">{player2 ? player2.name : 'WAITING'}</span>
                <span className="text-sm font-black text-slate-400 uppercase tracking-widest block mb-0.5">SYMBOL: O</span>
              </div>

            </section>

            {/* Footer Action buttons */}
            <footer className="w-full flex gap-3 justify-center mt-2">
              <button 
                onClick={handleCreateNewRoom}
                className={`glass-panel glass-panel-interactive px-6 py-2.5 rounded-full flex items-center gap-2 text-[10px] sm:text-xs font-bold hover:text-white ${!roomState.gameActive ? 'text-slate-300' : 'text-rose-400 hover:text-rose-300'}`}
                aria-label={!roomState.gameActive ? 'New Room' : 'Abandon match'}
              >
                <Plus className={`w-4 h-4 ${!roomState.gameActive ? '' : 'rotate-45'}`} />
                {!roomState.gameActive ? 'CREATE NEW ROOM' : 'ABANDON ROUND'}
              </button>
            </footer>

          </section>
        )}

      </main>

    </div>
  );
}
