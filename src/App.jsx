import React, { useState, useEffect } from 'react';
import {
    Bell, Package, Wrench, ShoppingCart, Users, Plus,
    Edit2, Trash2, Image as ImageIcon, Search, LogOut,
    Check, AlertTriangle, X, UserCheck, Key, Lock, Grid,
    Truck, DollarSign, TrendingUp, Calendar, Building2,
    BarChart3, Save, FileText, CheckCircle2, ChevronDown, ChevronUp,
    ExternalLink, Copy, AppWindow, Award, Trophy, User, ShieldCheck, Settings, Star, Printer,
    Cloud, CloudOff, RefreshCw, Radio, Phone, MessageSquare, Volume2, VolumeX, Sliders,
    Smartphone, CheckSquare, Square, Eye, EyeOff, Shield, Sparkles, RefreshCw as RotateIcon, Menu,
    Coins, Clock, Layers, ListPlus, HelpCircle, Send, Info, Tag
} from 'lucide-react';
import { initializeApp, getApps, getApp } from 'firebase/app';
import {
    getFirestore, collection, onSnapshot, doc, setDoc, deleteDoc
} from 'firebase/firestore';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';

const DEFAULT_UTILITY_APPS = [
    { id: '1', name: 'WhatsApp Web', category: 'Comunicação', url: 'https://web.whatsapp.com', icon: '💬', description: 'Atendimento e orçamentos para clientes' },
    { id: '2', name: 'Consulta IMEI (Anatel)', category: 'Consultas', url: 'https://www.consultareclamacoes.anatel.gov.br', icon: '📱', description: 'Verificar restrições e impedimentos de IMEI' },
    { id: '3', name: 'Consulta CNPJ Receita', category: 'Consultas', url: 'https://solucoes.receita.fazenda.gov.br', icon: '🔍', description: 'Dados cadastrais de fornecedores e empresas' }
];

const DEFAULT_POINT_RULES = {
    basePointsOS: 10,
    entryPoints: 2,
    deliveryPoints: 3,
    orderedPartsPoints: 5,
    categoryPoints: {
        'Telas': 15,
        'Baterias': 10,
        'Placas': 25,
        'Conectores': 10,
        'Carcaças': 12,
        'Acessórios': 5,
        'Outros': 5
    }
};

const DEFAULT_EXTRA_CONFIG = {
    numEmployees: 3,
    payoutDay: 'Sábado'
};

const DEFAULT_FILMS = [
    { id: '1', phoneModel: 'iPhone 11', compatibleWith: 'iPhone XR, iPhone 11', filmType: '3D Vidro', notes: 'Mesmo tamanho de tela 6.1"' },
    { id: '2', phoneModel: 'iPhone 12 / 12 Pro', compatibleWith: 'iPhone 12, iPhone 12 Pro', filmType: 'Privacidade', notes: 'Compatível 100% entre 12 e 12 Pro' },
    { id: '3', phoneModel: 'Samsung A10 / A20 / A30', compatibleWith: 'Samsung A10, A20, A30, A50, M10, M20', filmType: '3D Vidro', notes: 'Mesmo recorte da câmera gota' }
];

const COUNTRY_CODES = [
    { code: '+55', country: 'Brasil', flag: '🇧🇷' },
    { code: '+1', country: 'EUA / Canadá', flag: '🇺🇸' },
    { code: '+351', country: 'Portugal', flag: '🇵🇹' },
    { code: '+54', country: 'Argentina', flag: '🇦🇷' },
    { code: '+595', country: 'Paraguai', flag: '🇵🇾' },
    { code: '+244', country: 'Angola', flag: '🇦🇴' },
    { code: '+598', country: 'Uruguai', flag: '🇺🇾' },
    { code: '+56', country: 'Chile', flag: '🇨🇱' },
    { code: '+34', country: 'Espanha', flag: '🇪🇸' },
    { code: '+39', country: 'Itália', flag: '🇮🇹' }
];

// Sound generator using Web Audio API
const playAppSound = (type = 'success', soundEnabled = true, volume = 0.5) => {
    if (!soundEnabled) return;
    try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) return;
        const ctx = new AudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        gain.gain.value = volume * 0.15;

        if (type === 'click') {
            osc.frequency.setValueAtTime(400, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.04);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.04);
            osc.start();
            osc.stop(ctx.currentTime + 0.04);
        } else if (type === 'success') {
            osc.frequency.setValueAtTime(523.25, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(659.25, ctx.currentTime + 0.1);
            osc.frequency.exponentialRampToValueAtTime(783.99, ctx.currentTime + 0.2);
            osc.start();
            osc.stop(ctx.currentTime + 0.3);
        } else if (type === 'alert') {
            osc.frequency.setValueAtTime(440, ctx.currentTime);
            osc.frequency.setValueAtTime(880, ctx.currentTime + 0.1);
            osc.start();
            osc.stop(ctx.currentTime + 0.25);
        }
    } catch (e) {
        console.error('Audio error:', e);
    }
};

// =====================================================================
// NOVO: Função Global de Câmera Capacitor
// Colocada fora dos componentes para que qualquer tab possa acessá-la
// =====================================================================
const tirarFotoComCamera = async () => {
    try {
        const status = await Camera.checkPermissions();
        if (status.camera !== 'granted' && status.camera !== 'prompt') {
            const req = await Camera.requestPermissions();
            if (req.camera !== 'granted') {
                alert('Permissão de câmera negada. Habilite nas configurações do celular.');
                return null;
            }
        }

        const image = await Camera.getPhoto({
            quality: 80,
            allowEditing: false,
            resultType: CameraResultType.DataUrl,
            source: CameraSource.Prompt // Prompt nativo (Câmera ou Galeria)
        });

        return image.dataUrl;
    } catch (error) {
        console.log("Câmera ou seleção cancelada:", error);
        return null;
    }
};

// MINI VISUALIZER FOR PATTERN LOCK
function PatternMiniVisualizer({ pattern }) {
    if (!pattern) return null;
    const dots = [1, 2, 3, 4, 5, 6, 7, 8, 9];
    const sequence = pattern.split('-').map(Number);

    return (
        <div className="grid grid-cols-3 gap-1 w-10 h-10 p-1 bg-amber-100 rounded-lg border border-amber-300 shrink-0">
            {dots.map(dot => {
                const isActive = sequence.includes(dot);
                return (
                    <div
                        key={dot}
                        className={`w-full h-full rounded-full transition-all ${isActive ? 'bg-amber-600 shadow-sm' : 'bg-amber-200/60'}`}
                    />
                );
            })}
        </div>
    );
}

// INTERACTIVE PATTERN PICKER
function PatternInteractivePicker({ value, onChange }) {
    const dots = [1, 2, 3, 4, 5, 6, 7, 8, 9];
    const selected = value ? value.split('-').map(Number) : [];

    const toggleDot = (num) => {
        let newSeq = [...selected];
        if (newSeq.includes(num)) {
            newSeq = newSeq.filter(n => n !== num);
        } else {
            newSeq.push(num);
        }
        onChange(newSeq.join('-'));
    };

    return (
        <div className="space-y-2">
            <div className="grid grid-cols-3 gap-2.5 w-40 mx-auto p-3 bg-amber-100/80 rounded-2xl border border-amber-200 shadow-inner">
                {dots.map(num => {
                    const isSelected = selected.includes(num);
                    const idx = selected.indexOf(num);
                    return (
                        <button
                            type="button"
                            key={num}
                            onClick={() => toggleDot(num)}
                            className={`w-10 h-10 rounded-full font-bold text-xs flex items-center justify-center transition-all ${isSelected ? 'bg-amber-600 text-white shadow-md scale-105' : 'bg-white text-slate-400 border border-amber-200 hover:bg-amber-50'}`}
                        >
                            {isSelected ? idx + 1 : num}
                        </button>
                    );
                })}
            </div>
            <div className="flex justify-between items-center px-1">
                <span className="text-[11px] font-mono font-bold text-amber-900">
                    {value ? `Padrão: ${value}` : 'Nenhum ponto selecionado'}
                </span>
                {value && (
                    <button type="button" onClick={() => onChange('')} className="text-[10px] text-red-600 font-bold hover:underline">
                        Limpar
                    </button>
                )}
            </div>
        </div>
    );
}

export default function App() {
    const [user, setUser] = useState(null);
    const [usersList, setUsersList] = useState([]);
    const [inventory, setInventory] = useState([]);
    const [orders, setOrders] = useState([]);
    const [shoppingList, setShoppingList] = useState([]);
    const [orderedParts, setOrderedParts] = useState([]);
    const [closedReports, setClosedReports] = useState([]);
    const [utilityApps, setUtilityApps] = useState([]);
    const [storePasswords, setStorePasswords] = useState([]);
    const [pointRules, setPointRules] = useState(DEFAULT_POINT_RULES);

    const [filmsList, setFilmsList] = useState([]);
    const [weeklyExtras, setWeeklyExtras] = useState([]);
    const [weeklyExtrasConfig, setWeeklyExtrasConfig] = useState(DEFAULT_EXTRA_CONFIG);
    const [weeklyExtrasHistory, setWeeklyExtrasHistory] = useState([]);
    const [customExtraLists, setCustomExtraLists] = useState([]);

    const [fotoVisualizando, setFotoVisualizando] = useState(null);

    const [activeTab, setActiveTab] = useState('orders');
    const [notifications, setNotifications] = useState([]);
    const [showNotifications, setShowNotifications] = useState(false);
    const [loginError, setLoginError] = useState('');
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const [appSettings, setAppSettings] = useState({
        soundEnabled: true,
        notificationsEnabled: true,
        soundVolume: 0.5,
        autoOpenWhatsapp: true,
        notifyOsEntry: true,
        notifyOsRetirado: true,
        notifyNewInventory: true,
        notifyLowStock: true,
        notifyWarrantyExpire: true,
        notifyDelayPickup: true,
        notifyDelayWork: true
    });

    const [db, setDb] = useState(null);
    const [isCloudConnected, setIsCloudConnected] = useState(false);
    const [showFirebaseModal, setShowFirebaseModal] = useState(false);
    const [firebaseConfigRaw, setFirebaseConfigRaw] = useState('');

    useEffect(() => {
        const savedUser = localStorage.getItem('playcell_user');
        if (savedUser) setUser(JSON.parse(savedUser));

        const savedSettings = localStorage.getItem('playcell_appSettings');
        if (savedSettings) setAppSettings(prev => ({ ...prev, ...JSON.parse(savedSettings) }));

        const savedConfig = localStorage.getItem('playcell_firebaseConfig');
        if (savedConfig) {
            setFirebaseConfigRaw(savedConfig);
            try {
                const parsed = JSON.parse(savedConfig);
                const app = getApps().length === 0 ? initializeApp(parsed) : getApp();
                const firestore = getFirestore(app);
                setDb(firestore);
                setIsCloudConnected(true);
            } catch (err) {
                console.error('Erro ao conectar Firebase:', err);
                setIsCloudConnected(false);
            }
        } else {
            const savedUsersList = localStorage.getItem('techApp_usersList');
            if (savedUsersList) setUsersList(JSON.parse(savedUsersList));

            const savedInventory = localStorage.getItem('techApp_inventory');
            if (savedInventory) setInventory(JSON.parse(savedInventory));

            const savedOrders = localStorage.getItem('techApp_orders');
            if (savedOrders) setOrders(JSON.parse(savedOrders));

            const savedShopping = localStorage.getItem('techApp_shopping');
            if (savedShopping) setShoppingList(JSON.parse(savedShopping));

            const savedOrderedParts = localStorage.getItem('techApp_orderedParts');
            if (savedOrderedParts) setOrderedParts(JSON.parse(savedOrderedParts));

            const savedReports = localStorage.getItem('techApp_closedReports');
            if (savedReports) setClosedReports(JSON.parse(savedReports));

            const savedApps = localStorage.getItem('techApp_utilityApps');
            setUtilityApps(savedApps ? JSON.parse(savedApps) : DEFAULT_UTILITY_APPS);

            const savedPasswords = localStorage.getItem('techApp_storePasswords');
            if (savedPasswords) setStorePasswords(JSON.parse(savedPasswords));

            const savedRules = localStorage.getItem('techApp_pointRules');
            if (savedRules) setPointRules(JSON.parse(savedRules));

            const savedFilms = localStorage.getItem('techApp_filmsList');
            setFilmsList(savedFilms ? JSON.parse(savedFilms) : DEFAULT_FILMS);

            const savedExtras = localStorage.getItem('techApp_weeklyExtras');
            if (savedExtras) setWeeklyExtras(JSON.parse(savedExtras));

            const savedExtraCfg = localStorage.getItem('techApp_weeklyExtrasConfig');
            if (savedExtraCfg) setWeeklyExtrasConfig(JSON.parse(savedExtraCfg));

            const savedExtraHist = localStorage.getItem('techApp_weeklyExtrasHistory');
            if (savedExtraHist) setWeeklyExtrasHistory(JSON.parse(savedExtraHist));

            const savedCustomLists = localStorage.getItem('techApp_customExtraLists');
            if (savedCustomLists) setCustomExtraLists(JSON.parse(savedCustomLists));
        }
    }, []);

    useEffect(() => {
        if (!db) return;
        const unsubs = [];
        unsubs.push(onSnapshot(collection(db, 'users'), (snap) => {
            const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            setUsersList(docs);
            if (user) {
                const currentInDb = docs.find(u => u.id === user.id || u.email?.toLowerCase() === user.email?.toLowerCase());
                if (currentInDb) {
                    setUser(currentInDb);
                    localStorage.setItem('playcell_user', JSON.stringify(currentInDb));
                }
            }
        }));
        unsubs.push(onSnapshot(collection(db, 'inventory'), (snap) => {
            setInventory(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        }));
        unsubs.push(onSnapshot(collection(db, 'orders'), (snap) => {
            setOrders(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        }));
        unsubs.push(onSnapshot(collection(db, 'orderedParts'), (snap) => {
            setOrderedParts(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        }));
        unsubs.push(onSnapshot(collection(db, 'shoppingList'), (snap) => {
            setShoppingList(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        }));
        unsubs.push(onSnapshot(collection(db, 'closedReports'), (snap) => {
            setClosedReports(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        }));
        unsubs.push(onSnapshot(collection(db, 'utilityApps'), (snap) => {
            if (!snap.empty) setUtilityApps(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        }));
        unsubs.push(onSnapshot(collection(db, 'storePasswords'), (snap) => {
            setStorePasswords(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        }));
        unsubs.push(onSnapshot(collection(db, 'filmsList'), (snap) => {
            if (!snap.empty) setFilmsList(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        }));
        unsubs.push(onSnapshot(collection(db, 'weeklyExtras'), (snap) => {
            setWeeklyExtras(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        }));
        unsubs.push(onSnapshot(collection(db, 'weeklyExtrasHistory'), (snap) => {
            setWeeklyExtrasHistory(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        }));
        unsubs.push(onSnapshot(collection(db, 'customExtraLists'), (snap) => {
            setCustomExtraLists(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        }));
        unsubs.push(onSnapshot(collection(db, 'settings'), (snap) => {
            const rulesDoc = snap.docs.find(d => d.id === 'pointRules');
            if (rulesDoc) setPointRules(rulesDoc.data());
            const extraCfgDoc = snap.docs.find(d => d.id === 'weeklyExtrasConfig');
            if (extraCfgDoc) setWeeklyExtrasConfig(extraCfgDoc.data());
        }));
        return () => unsubs.forEach(unsub => unsub());
    }, [db, user?.id]);

    useEffect(() => { if (!db) localStorage.setItem('techApp_usersList', JSON.stringify(usersList)); }, [usersList, db]);
    useEffect(() => { if (!db) localStorage.setItem('techApp_inventory', JSON.stringify(inventory)); }, [inventory, db]);
    useEffect(() => { if (!db) localStorage.setItem('techApp_orders', JSON.stringify(orders)); }, [orders, db]);
    useEffect(() => { if (!db) localStorage.setItem('techApp_shopping', JSON.stringify(shoppingList)); }, [shoppingList, db]);
    useEffect(() => { if (!db) localStorage.setItem('techApp_orderedParts', JSON.stringify(orderedParts)); }, [orderedParts, db]);
    useEffect(() => { if (!db) localStorage.setItem('techApp_closedReports', JSON.stringify(closedReports)); }, [closedReports, db]);
    useEffect(() => { if (!db) localStorage.setItem('techApp_utilityApps', JSON.stringify(utilityApps)); }, [utilityApps, db]);
    useEffect(() => { if (!db) localStorage.setItem('techApp_storePasswords', JSON.stringify(storePasswords)); }, [storePasswords, db]);
    useEffect(() => { if (!db) localStorage.setItem('techApp_pointRules', JSON.stringify(pointRules)); }, [pointRules, db]);
    useEffect(() => { if (!db) localStorage.setItem('techApp_filmsList', JSON.stringify(filmsList)); }, [filmsList, db]);
    useEffect(() => { if (!db) localStorage.setItem('techApp_weeklyExtras', JSON.stringify(weeklyExtras)); }, [weeklyExtras, db]);
    useEffect(() => { if (!db) localStorage.setItem('techApp_weeklyExtrasConfig', JSON.stringify(weeklyExtrasConfig)); }, [weeklyExtrasConfig, db]);
    useEffect(() => { if (!db) localStorage.setItem('techApp_weeklyExtrasHistory', JSON.stringify(weeklyExtrasHistory)); }, [weeklyExtrasHistory, db]);
    useEffect(() => { if (!db) localStorage.setItem('techApp_customExtraLists', JSON.stringify(customExtraLists)); }, [customExtraLists, db]);
    useEffect(() => { localStorage.setItem('playcell_appSettings', JSON.stringify(appSettings)); }, [appSettings]);

    const saveDocCloud = async (colName, id, data) => {
        if (db) {
            try {
                await setDoc(doc(db, colName, String(id)), data, { merge: true });
            } catch (err) {
                console.error(`Erro ao salvar na nuvem (${colName}):`, err);
            }
        }
    };

    const deleteDocCloud = async (colName, id) => {
        if (db) {
            try {
                await deleteDoc(doc(db, colName, String(id)));
            } catch (err) {
                console.error(`Erro ao deletar da nuvem (${colName}):`, err);
            }
        }
    };

    useEffect(() => {
        if (!appSettings.notificationsEnabled) {
            setNotifications([]);
            return;
        }

        const alerts = [];
        const now = new Date();

        if (appSettings.notifyLowStock !== false) {
            inventory.forEach(item => {
                const min = item.minStock || item.minQuantity || 2;
                if (item.quantity <= min) {
                    alerts.push({ id: `stock-${item.id}`, type: 'warning', text: `Estoque Baixo: ${item.name} (${item.quantity} restantes)` });
                }
            });
        }

        if (appSettings.notifyNewInventory !== false) {
            inventory.forEach(item => {
                if (item.createdAt || item.updatedAt) {
                    const itemDate = new Date(item.createdAt || item.updatedAt);
                    const diffHours = Math.abs(now - itemDate) / (1000 * 60 * 60);
                    if (diffHours <= 48) {
                        alerts.push({ id: `new-prod-${item.id}`, type: 'info', text: `Novo Produto em Estoque: ${item.name} (${item.quantity} un.)` });
                    }
                }
            });
        }

        if (appSettings.notifyOsEntry !== false) {
            orders.forEach(order => {
                if (order.status === 'pendente' || order.status === 'Em Aberto') {
                    alerts.push({ id: `entry-os-${order.id}`, type: 'info', text: `Entrada de OS (Pendente): ${order.customer || order.clientName} - ${order.device || order.deviceModel}` });
                }
            });
        }

        if (appSettings.notifyOsRetirado !== false) {
            orders.forEach(order => {
                if ((order.status === 'retirado' || order.status === 'Entregue') && order.deliveryDate) {
                    const delDate = new Date(order.deliveryDate);
                    const diffHours = Math.abs(now - delDate) / (1000 * 60 * 60);
                    if (diffHours <= 48) {
                        alerts.push({ id: `delivered-${order.id}`, type: 'success', text: `Aparelho Retirado: OS de ${order.customer || order.clientName} (${order.device || order.deviceModel})` });
                    }
                }
            });
        }

        if (appSettings.notifyDelayPickup !== false) {
            orders.forEach(order => {
                if ((order.status === 'concluido' || order.status === 'Pronto') && order.endDate) {
                    const endD = new Date(order.endDate);
                    const diffDays = Math.floor((now - endD) / (1000 * 60 * 60 * 24));
                    if (diffDays >= 3) {
                        alerts.push({ id: `delay-pk-${order.id}`, type: 'warning', text: `Aparelho Pronto há ${diffDays} dias sem retirada: ${order.customer || order.clientName} (${order.device || order.deviceModel})` });
                    }
                }
            });
        }

        if (appSettings.notifyDelayWork !== false) {
            orders.forEach(order => {
                if ((order.status === 'andamento' || order.status === 'Em Andamento') && order.startDate) {
                    const startD = new Date(order.startDate);
                    const diffDays = Math.floor((now - startD) / (1000 * 60 * 60 * 24));
                    if (diffDays >= 3) {
                        alerts.push({ id: `delay-wk-${order.id}`, type: 'warning', text: `OS em Andamento há ${diffDays} dias: ${order.customer || order.clientName} (${order.device || order.deviceModel})` });
                    }
                }
            });
        }

        if (appSettings.notifyWarrantyExpire !== false && user?.role === 'admin') {
            orders.forEach(order => {
                if ((order.status === 'retirado' || order.status === 'Entregue') && order.deliveryDate) {
                    const delivery = new Date(order.deliveryDate);
                    const diffDays = Math.ceil(Math.abs(now - delivery) / (1000 * 60 * 60 * 24));
                    if (diffDays >= 90) {
                        alerts.push({ id: `war-${order.id}`, type: 'error', text: `Garantia Expirando (90 dias): OS de ${order.customer || order.clientName} (${order.device || order.deviceModel})` });
                    }
                }
            });
        }

        setNotifications(alerts);
    }, [inventory, orders, user, appSettings]);

    const handleLogin = (e) => {
        e.preventDefault();
        setLoginError('');
        const formData = new FormData(e.target);
        const name = formData.get('name')?.trim() || '';
        const email = formData.get('email').trim().toLowerCase();
        const password = formData.get('password')?.trim() || '';

        let existingUser = usersList.find(u => u.email && u.email.toLowerCase() === email);

        if (!existingUser) {
            if (!name) {
                setLoginError('Informe seu nome completo para criar sua conta.');
                return;
            }
            if (!password || password.length < 3) {
                setLoginError('A senha de acesso deve ter no mínimo 3 caracteres.');
                return;
            }
            const role = usersList.length === 0 ? 'admin' : 'funcionario';
            existingUser = {
                id: Date.now().toString(),
                name,
                email,
                password,
                role,
                avatarUrl: ''
            };
            setUsersList(prev => [...prev, existingUser]);
            saveDocCloud('users', existingUser.id, existingUser);
        } else {
            if (existingUser.password && existingUser.password !== password) {
                setLoginError('Senha de acesso incorreta! Tente novamente.');
                playAppSound('alert', appSettings.soundEnabled, appSettings.soundVolume);
                return;
            }
            if (!existingUser.password && password) {
                existingUser = { ...existingUser, password };
                saveDocCloud('users', existingUser.id, existingUser);
            }
            if (name && existingUser.name !== name) {
                existingUser = { ...existingUser, name };
                saveDocCloud('users', existingUser.id, existingUser);
            }
        }

        setUser(existingUser);
        localStorage.setItem('playcell_user', JSON.stringify(existingUser));
        playAppSound('success', appSettings.soundEnabled, appSettings.soundVolume);
    };

    const handleLogout = () => {
        setUser(null);
        localStorage.removeItem('playcell_user');
    };

    const handleUpdateUserProfile = (updatedUserData) => {
        setUser(updatedUserData);
        localStorage.setItem('playcell_user', JSON.stringify(updatedUserData));
        setUsersList(prev => prev.map(u => u.id === updatedUserData.id ? updatedUserData : u));
        saveDocCloud('users', updatedUserData.id, updatedUserData);
        playAppSound('success', appSettings.soundEnabled, appSettings.soundVolume);
    };

    const handleSaveFirebaseConfig = (e) => {
        e.preventDefault();
        try {
            let configObj = null;
            if (firebaseConfigRaw.includes('apiKey')) {
                const extractField = (key) => {
                    const match = firebaseConfigRaw.match(new RegExp(`${key}:\\s*["']([^"']+)["']`));
                    return match ? match[1] : '';
                };
                configObj = {
                    apiKey: extractField('apiKey'),
                    authDomain: extractField('authDomain'),
                    projectId: extractField('projectId'),
                    storageBucket: extractField('storageBucket'),
                    messagingSenderId: extractField('messagingSenderId'),
                    appId: extractField('appId')
                };
            } else {
                configObj = JSON.parse(firebaseConfigRaw);
            }

            if (!configObj || !configObj.apiKey) {
                alert('Configuração inválida! Cole o bloco "const firebaseConfig = { ... }" do Firebase.');
                return;
            }

            localStorage.setItem('playcell_firebaseConfig', JSON.stringify(configObj));
            const app = getApps().length === 0 ? initializeApp(configObj) : getApp();
            const firestore = getFirestore(app);
            setDb(firestore);
            setIsCloudConnected(true);
            setShowFirebaseModal(false);
            playAppSound('success', appSettings.soundEnabled, appSettings.soundVolume);
            alert('Sincronização em Nuvem ativada com sucesso!');
        } catch (err) {
            alert('Erro ao processar as chaves do Firebase: ' + err.message);
        }
    };

    const handleDisconnectFirebase = () => {
        if (window.confirm('Desconectar a Nuvem? O sistema voltará a salvar apenas na memória local.')) {
            localStorage.removeItem('playcell_firebaseConfig');
            setDb(null);
            setIsCloudConnected(false);
            setShowFirebaseModal(false);
        }
    };

    if (!user) {
        return (
            <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
                <div className="bg-white p-8 rounded-3xl shadow-2xl w-full max-w-md border border-slate-800 relative">
                    <div className="flex justify-end mb-2">
                        <button
                            onClick={() => setShowFirebaseModal(true)}
                            className={`text-xs font-bold px-3 py-1.5 rounded-xl border flex items-center space-x-1.5 transition-all ${isCloudConnected ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200'}`}
                        >
                            <Cloud className={`w-3.5 h-3.5 ${isCloudConnected ? 'text-emerald-600' : 'text-slate-400'}`} />
                            <span>{isCloudConnected ? 'Nuvem Conectada' : '⚙️ Conectar Nuvem da Loja'}</span>
                        </button>
                    </div>

                    <div className="text-center mb-6">
                        <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg shadow-blue-500/30 text-white">
                            <Wrench className="w-8 h-8" />
                        </div>
                        <h1 className="text-2xl font-black text-slate-800 tracking-tight">PlayCell Manager</h1>
                        <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mt-1">Gestão Técnica & Balcão</p>
                    </div>

                    <form onSubmit={handleLogin} className="space-y-4">
                        {loginError && (
                            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-bold rounded-xl flex items-center space-x-2">
                                <AlertTriangle className="w-4 h-4 shrink-0" />
                                <span>{loginError}</span>
                            </div>
                        )}
                        <div>
                            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Nome Completo (Novo cadastro)</label>
                            <input name="name" type="text" className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none text-sm" placeholder="Ex: João Silva" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">E-mail de Acesso</label>
                            <input name="email" type="email" required className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none text-sm" placeholder="seuemail@loja.com" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Senha de Acesso</label>
                            <input name="password" type="password" required className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none text-sm" placeholder="••••••••" />
                        </div>
                        <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl transition-all shadow-md text-sm mt-2">
                            Entrar no Sistema
                        </button>
                    </form>
                </div>

                {showFirebaseModal && (
                    <FirebaseModal
                        show={showFirebaseModal}
                        onClose={() => setShowFirebaseModal(false)}
                        firebaseConfigRaw={firebaseConfigRaw}
                        setFirebaseConfigRaw={setFirebaseConfigRaw}
                        isCloudConnected={isCloudConnected}
                        handleSaveFirebaseConfig={handleSaveFirebaseConfig}
                        handleDisconnectFirebase={handleDisconnectFirebase}
                    />
                )}
            </div>
        );
    }

    if (user && user.role === 'pendente') {

        const renderModalFoto = () => {
            if (!fotoVisualizando) return null;
            return (
                <div
                    className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm"
                    onClick={() => setFotoVisualizando(null)}
                >
                    <div className="relative max-w-3xl w-full flex flex-col items-center">
                        <button
                            onClick={() => setFotoVisualizando(null)}
                            className="absolute -top-10 right-0 text-white hover:text-gray-300 font-bold text-lg flex items-center gap-1 bg-gray-800/80 px-3 py-1 rounded-full"
                        >
                            <X size={20} /> Fechar
                        </button>
                        <img
                            src={fotoVisualizando}
                            alt="Visualização"
                            className="max-h-[85vh] max-w-full rounded-lg shadow-2xl object-contain border border-gray-700"
                        />
                    </div>
                </div>
            );
        };

        return (
            <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
                {renderModalFoto()}
                <div className="bg-white p-8 rounded-3xl shadow-2xl w-full max-w-md text-center border border-slate-200 relative overflow-hidden">
                    <div className="w-20 h-20 bg-amber-100 text-amber-600 rounded-3xl flex items-center justify-center mx-auto mb-5 shadow-inner">
                        <Clock className="w-10 h-10 animate-spin" style={{ animationDuration: '6s' }} />
                    </div>
                    <span className="text-xs font-bold uppercase tracking-widest text-amber-600 bg-amber-50 px-3 py-1 rounded-full border border-amber-200">
                        Cadastro em Análise
                    </span>
                    <h2 className="text-2xl font-black text-slate-800 mt-4">Aguardando Aprovação</h2>
                    <p className="text-slate-600 text-sm mt-2 leading-relaxed">
                        Sua conta para <strong className="text-slate-800">{user.name}</strong> foi criada! Um administrador da loja precisa aprovar seu acesso.
                    </p>
                    <div className="my-6 p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-500 text-left space-y-1">
                        <p><strong>E-mail:</strong> {user.email}</p>
                        <p><strong>Status:</strong> <span className="text-amber-600 font-bold">Acesso Pendente</span></p>
                    </div>
                    <div className="space-y-2">
                        <button
                            onClick={() => window.location.reload()}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-2xl transition-all shadow-md flex items-center justify-center space-x-2 text-sm"
                        >
                            <RefreshCw className="w-4 h-4" />
                            <span>Verificar Aprovação Agora</span>
                        </button>
                        <button
                            onClick={handleLogout}
                            className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 rounded-2xl transition-all text-xs flex items-center justify-center space-x-2"
                        >
                            <LogOut className="w-4 h-4" />
                            <span>Sair / Trocar de Conta</span>
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    const userRoleLabel = user.role === 'admin' ? 'Administrador' : 'Colaborador';

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row relative font-sans">
            {isMobileMenuOpen && (
                <div
                    className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 md:hidden transition-opacity"
                    onClick={() => setIsMobileMenuOpen(false)}
                ></div>
            )}

            {/* SIDEBAR NAVIGATION */}
            <div className={`fixed inset-y-0 left-0 z-50 w-[260px] md:w-64 bg-slate-900 text-slate-300 flex flex-col h-screen shrink-0 transform transition-transform duration-300 ease-in-out ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} md:relative md:translate-x-0`}>
                <div className="p-5 flex items-center justify-between border-b border-slate-800">
                    <div className="flex items-center space-x-3">
                        <div className="bg-blue-600 p-2.5 rounded-xl shadow-md text-white"><Wrench className="w-5 h-5" /></div>
                        <div>
                            <span className="font-black text-lg text-white tracking-tight block leading-none">PlayCell</span>
                            <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">Manager OS</span>
                        </div>
                    </div>
                    <button onClick={() => setIsMobileMenuOpen(false)} className="md:hidden text-slate-400 hover:text-white p-1">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto py-4">
                    <nav className="space-y-1 px-3">
                        {[
                            { id: 'orders', icon: Wrench, label: 'Ordens de Serviço' },
                            { id: 'inventory', icon: Package, label: 'Estoque de Peças' },
                            { id: 'films', icon: Smartphone, label: 'Películas Compatíveis' },
                            { id: 'ordered_parts', icon: Truck, label: 'Peças Pedidas' },
                            { id: 'weekly_extras', icon: Sparkles, label: 'Extras da Semana' },
                            { id: 'shopping', icon: ShoppingCart, label: 'Lista de Compras' },
                            { id: 'passwords', icon: Key, label: 'Gerenciador de Senhas' },
                            { id: 'collaborators', icon: Award, label: 'Colaboradores & Pontos' },
                            { id: 'reports', icon: BarChart3, label: 'Resumo & Fechamento' },
                            { id: 'apps', icon: AppWindow, label: 'Apps & Links Úteis' },
                            { id: 'settings', icon: Settings, label: 'Configurações & Perfil' },
                        ].map(item => (
                            <button
                                key={item.id}
                                onClick={() => {
                                    setActiveTab(item.id);
                                    setIsMobileMenuOpen(false);
                                    playAppSound('click', appSettings.soundEnabled, appSettings.soundVolume);
                                }}
                                className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${activeTab === item.id ? 'bg-blue-600 text-white font-semibold shadow-md shadow-blue-900/30' : 'text-slate-400 hover:bg-slate-800/80 hover:text-white'}`}
                            >
                                <item.icon className={`w-4 h-4 shrink-0 ${activeTab === item.id ? 'text-white' : 'text-slate-400'}`} />
                                <span className="truncate">{item.label}</span>
                            </button>
                        ))}

                        {user.role === 'admin' && (
                            <div className="pt-3 mt-3 border-t border-slate-800/80">
                                <button
                                    onClick={() => {
                                        setActiveTab('team');
                                        setIsMobileMenuOpen(false);
                                        playAppSound('click', appSettings.soundEnabled, appSettings.soundVolume);
                                    }}
                                    className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${activeTab === 'team' ? 'bg-indigo-600 text-white font-semibold shadow-md shadow-indigo-900/30' : 'text-slate-400 hover:bg-slate-800/80 hover:text-white'}`}
                                >
                                    <Users className={`w-4 h-4 shrink-0 ${activeTab === 'team' ? 'text-white' : 'text-slate-400'}`} />
                                    <span className="truncate">Equipe & Acessos</span>
                                </button>
                            </div>
                        )}
                    </nav>
                </div>

                <div className="p-4 border-t border-slate-800 bg-slate-950/50 space-y-3">
                    <button
                        onClick={() => setShowFirebaseModal(true)}
                        className={`w-full p-2.5 rounded-xl border text-xs font-bold flex items-center justify-between transition-all ${isCloudConnected ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300' : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700 hover:text-white'}`}
                    >
                        <div className="flex items-center space-x-2">
                            {isCloudConnected ? <Cloud className="w-4 h-4 text-emerald-400" /> : <CloudOff className="w-4 h-4 text-slate-400" />}
                            <span>{isCloudConnected ? 'Nuvem Ativa' : 'Conectar Nuvem'}</span>
                        </div>
                        <span className={`w-2 h-2 rounded-full ${isCloudConnected ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`}></span>
                    </button>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                        <div className="flex items-center space-x-3 overflow-hidden">
                            <div className="w-9 h-9 rounded-xl bg-blue-600 text-white font-bold flex items-center justify-center shrink-0 border border-blue-400 overflow-hidden text-sm">
                                {user.avatarUrl ? (
                                    <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" />
                                ) : (
                                    user.name.charAt(0).toUpperCase()
                                )}
                            </div>
                            <div className="truncate">
                                <p className="text-xs font-bold text-white truncate">{user.name}</p>
                                <span className="text-[10px] text-slate-400 uppercase font-bold">{userRoleLabel}</span>
                            </div>
                        </div>
                        <button onClick={handleLogout} title="Sair do Sistema" className="text-slate-400 hover:text-red-400 p-2 rounded-lg transition-colors">
                            <LogOut className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>

            {/* MAIN CONTENT WORKSPACE */}
            <div className="flex-1 flex flex-col h-screen overflow-hidden">
                <header className="bg-white px-4 md:px-6 py-4 border-b border-slate-200 flex justify-between items-center shrink-0 shadow-sm">
                    <div className="flex items-center space-x-3">
                        <button
                            onClick={() => setIsMobileMenuOpen(true)}
                            className="p-2 -ml-2 text-slate-600 hover:bg-slate-100 rounded-xl md:hidden transition-colors"
                        >
                            <Menu className="w-6 h-6" />
                        </button>
                        <h2 className="text-xl font-bold text-slate-800 tracking-tight">
                            {activeTab === 'orders' && 'Ordens de Serviço'}
                            {activeTab === 'inventory' && 'Estoque de Peças'}
                            {activeTab === 'films' && 'Películas Compatíveis'}
                            {activeTab === 'ordered_parts' && 'Peças Pedidas'}
                            {activeTab === 'weekly_extras' && 'Extras da Semana'}
                            {activeTab === 'shopping' && 'Lista de Compras'}
                            {activeTab === 'passwords' && 'Gerenciador de Senhas'}
                            {activeTab === 'collaborators' && 'Colaboradores & Pontos'}
                            {activeTab === 'reports' && 'Resumo & Fechamento'}
                            {activeTab === 'apps' && 'Apps & Links Úteis'}
                            {activeTab === 'settings' && 'Configurações & Perfil'}
                            {activeTab === 'team' && 'Gestão de Equipe'}
                        </h2>
                    </div>

                    <div className="flex items-center space-x-3">
                        <button
                            onClick={() => setShowFirebaseModal(true)}
                            className={`px-3 py-1.5 rounded-full text-xs font-bold flex items-center space-x-1.5 transition-all ${isCloudConnected ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-600 border border-slate-200'}`}
                        >
                            <Radio className={`w-3.5 h-3.5 ${isCloudConnected ? 'text-emerald-600 animate-pulse' : 'text-slate-400'}`} />
                            <span className="hidden sm:inline">{isCloudConnected ? 'Nuvem Conectada' : 'Modo Offline'}</span>
                        </button>

                        <div className="relative">
                            <button onClick={() => setShowNotifications(!showNotifications)} className="p-2 relative bg-slate-100 hover:bg-slate-200 rounded-full transition-colors text-slate-600">
                                <Bell className="w-5 h-5" />
                                {notifications.length > 0 && (
                                    <span className="absolute top-0 right-0 w-3 h-3 bg-red-500 rounded-full border-2 border-white"></span>
                                )}
                            </button>

                            {showNotifications && (
                                <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-slate-100 z-50 overflow-hidden">
                                    <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                                        <span className="font-bold text-slate-800 text-sm">Alertas do Sistema</span>
                                        <span className="text-xs font-semibold bg-slate-200 text-slate-600 px-2 py-1 rounded-lg">{notifications.length}</span>
                                    </div>
                                    <div className="max-h-64 overflow-y-auto p-2">
                                        {notifications.length === 0 ? (
                                            <p className="text-sm text-slate-500 p-4 text-center">Nenhum alerta no momento.</p>
                                        ) : (
                                            notifications.map((notif, idx) => (
                                                <div key={idx} className={`p-3 text-sm mb-1 rounded-xl border ${notif.type === 'error' ? 'bg-red-50 border-red-100 text-red-700' :
                                                    notif.type === 'warning' ? 'bg-yellow-50 border-yellow-100 text-yellow-800' :
                                                        notif.type === 'success' ? 'bg-emerald-50 border-emerald-100 text-emerald-800' :
                                                            'bg-blue-50 border-blue-100 text-blue-800'
                                                    }`}>
                                                    {notif.text}
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </header>

                <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-slate-50/50">
                    {activeTab === 'orders' && <OrdersTab orders={orders} setOrders={setOrders} usersList={usersList} currentUser={user} saveDocCloud={saveDocCloud} deleteDocCloud={deleteDocCloud} appSettings={appSettings} />}
                    {activeTab === 'inventory' && <InventoryTab inventory={inventory} setInventory={setInventory} shoppingList={shoppingList} setShoppingList={setShoppingList} currentUser={user} saveDocCloud={saveDocCloud} deleteDocCloud={deleteDocCloud} />}
                    {activeTab === 'films' && <FilmsTab filmsList={filmsList} setFilmsList={setFilmsList} currentUser={user} saveDocCloud={saveDocCloud} deleteDocCloud={deleteDocCloud} />}
                    {activeTab === 'ordered_parts' && <OrderedPartsTab orderedParts={orderedParts} setOrderedParts={setOrderedParts} usersList={usersList} currentUser={user} saveDocCloud={saveDocCloud} deleteDocCloud={deleteDocCloud} />}
                    {activeTab === 'weekly_extras' && <WeeklyExtrasTab weeklyExtras={weeklyExtras} setWeeklyExtras={setWeeklyExtras} weeklyExtrasConfig={weeklyExtrasConfig} setWeeklyExtrasConfig={setWeeklyExtrasConfig} weeklyExtrasHistory={weeklyExtrasHistory} setWeeklyExtrasHistory={setWeeklyExtrasHistory} customExtraLists={customExtraLists} setCustomExtraLists={setCustomExtraLists} usersList={usersList} currentUser={user} saveDocCloud={saveDocCloud} deleteDocCloud={deleteDocCloud} />}
                    {activeTab === 'shopping' && <ShoppingTab />}
                    {activeTab === 'passwords' && <PasswordsTab />}
                    {activeTab === 'collaborators' && <CollaboratorsTab />}
                    {activeTab === 'reports' && <SummaryTab />}
                    {activeTab === 'apps' && <AppsTab />}
                    {activeTab === 'settings' && <SettingsTab />}
                    {activeTab === 'team' && <TeamTab />}
                </main>
            </div>

            {showFirebaseModal && (
                <FirebaseModal
                    show={showFirebaseModal}
                    onClose={() => setShowFirebaseModal(false)}
                    firebaseConfigRaw={firebaseConfigRaw}
                    setFirebaseConfigRaw={setFirebaseConfigRaw}
                    isCloudConnected={isCloudConnected}
                    handleSaveFirebaseConfig={handleSaveFirebaseConfig}
                    handleDisconnectFirebase={handleDisconnectFirebase}
                />
            )}
        </div>
    );
}

function FirebaseModal({ show, onClose, firebaseConfigRaw, setFirebaseConfigRaw, isCloudConnected, handleSaveFirebaseConfig, handleDisconnectFirebase }) {
    if (!show) return null;
    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
                <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-900 text-white shrink-0">
                    <div className="flex items-center space-x-2">
                        <Cloud className="w-5 h-5 text-emerald-400" />
                        <h3 className="font-bold text-base">Sincronização em Nuvem (Firebase)</h3>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
                </div>

                <form onSubmit={handleSaveFirebaseConfig} className="p-6 space-y-4 overflow-y-auto text-xs">
                    <div className="p-3 bg-blue-50 border border-blue-200 text-blue-800 rounded-xl">
                        <p className="font-bold mb-1">Como ativar em 1 minuto:</p>
                        <ol className="list-decimal pl-4 space-y-1 text-[11px]">
                            <li>Crie um projeto em <strong>console.firebase.google.com</strong></li>
                            <li>Ative o <strong>Firestore Database</strong> no modo de teste.</li>
                            <li>Cole o código <code className="bg-blue-100 px-1 rounded font-mono">const firebaseConfig = &#123; ... &#125;;</code> abaixo.</li>
                        </ol>
                    </div>

                    <div>
                        <label className="block font-bold text-slate-700 uppercase mb-1">Cole aqui o bloco firebaseConfig do Google:</label>
                        <textarea
                            rows="8"
                            required
                            value={firebaseConfigRaw}
                            onChange={(e) => setFirebaseConfigRaw(e.target.value)}
                            placeholder={`const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "playcell-manager.firebaseapp.com",
  projectId: "playcell-manager",
  ...
};`}
                            className="w-full p-3 font-mono text-[11px] bg-slate-50 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                        {isCloudConnected ? (
                            <button
                                type="button"
                                onClick={handleDisconnectFirebase}
                                className="px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 font-bold rounded-xl text-xs"
                            >
                                Desconectar
                            </button>
                        ) : <div></div>}

                        <div className="flex space-x-2">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl text-xs"
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-md"
                            >
                                Salvar e Conectar
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
}

function OrdersTab({ orders, setOrders, usersList, currentUser, saveDocCloud, deleteDocCloud, appSettings }) {
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('todos');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingOrder, setEditingOrder] = useState(null);
    const [printingOrder, setPrintingOrder] = useState(null);

    const [customer, setCustomer] = useState('');
    const [countryCode, setCountryCode] = useState('+55');
    const [phone, setPhone] = useState('');
    const [device, setDevice] = useState('');
    const [problem, setProblem] = useState('');
    const [category, setCategory] = useState('Telas');
    const [status, setStatus] = useState('pendente');
    const [price, setPrice] = useState('');
    const [discount, setDiscount] = useState('');
    const [deviceImage, setDeviceImage] = useState('');

    const [passwordType, setPasswordType] = useState('none');
    const [devicePassword, setDevicePassword] = useState('');

    const [leftCase, setLeftCase] = useState(false);
    const [leftSimTray, setLeftSimTray] = useState(false);
    const [leftSimCard, setLeftSimCard] = useState(false);

    const [paymentEntry, setPaymentEntry] = useState('');
    const [paymentExit, setPaymentExit] = useState('');
    const [pickupPerson, setPickupPerson] = useState('');

    const [entryDate, setEntryDate] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [deliveryDate, setDeliveryDate] = useState('');

    const [entryBy, setEntryBy] = useState('');
    const [techBy, setTechBy] = useState('');
    const [deliveredBy, setDeliveredBy] = useState('');

    const approvedUsers = usersList.filter(u => u.role === 'admin' || u.role === 'funcionario');

    const handleSimCardToggle = (checked) => {
        setLeftSimCard(checked);
        if (checked) {
            setLeftSimTray(true);
        }
    };

    const handleSimTrayToggle = (checked) => {
        setLeftSimTray(checked);
        if (!checked) {
            setLeftSimCard(false);
        }
    };

    // =======================================================
    // ATUALIZADO: Uso do botão para chamar a função global
    // =======================================================
    const handleDeviceImageUpload = async () => {
        try {
            const fotoNativa = await tirarFotoComCamera();
            if (fotoNativa) {
                setDeviceImage(fotoNativa);
            }
        } catch (err) {
            console.log('Erro ao abrir câmera ou galeria', err);
        }
    };

    const openModal = (order = null) => {
        setEditingOrder(order);
        setCustomer(order ? (order.customer || order.clientName || '') : '');
        setCountryCode(order ? (order.countryCode || '+55') : '+55');
        setPhone(order ? (order.phone || order.clientPhone || '') : '');
        setDevice(order ? (order.device || order.deviceModel || '') : '');
        setProblem(order ? order.problem : '');
        setCategory(order ? (order.category || 'Telas') : 'Telas');

        let initialStatus = 'pendente';
        if (order?.status) {
            if (order.status === 'Em Aberto') initialStatus = 'pendente';
            else if (order.status === 'Em Andamento') initialStatus = 'andamento';
            else if (order.status === 'Pronto') initialStatus = 'concluido';
            else if (order.status === 'Entregue') initialStatus = 'retirado';
            else initialStatus = order.status;
        }
        setStatus(initialStatus);

        setPrice(order ? (order.price || order.salePrice || '') : '');
        setDiscount(order ? order.discount || '' : '');
        setDeviceImage(order ? order.deviceImage || '' : '');

        setPasswordType(order ? (order.passwordType || (order.devicePassword ? (order.devicePassword.includes('-') ? 'pattern' : 'text') : 'none')) : 'none');
        setDevicePassword(order ? (order.devicePassword || (order.patternLock ? order.patternLock.join('-') : '')) : '');

        setLeftCase(order ? !!order.leftCase : false);
        setLeftSimTray(order ? !!order.leftSimTray : false);
        setLeftSimCard(order ? !!order.leftSimCard : false);

        setPaymentEntry(order ? order.paymentEntry || '' : '');
        setPaymentExit(order ? order.paymentExit || '' : '');
        setPickupPerson(order ? order.pickupPerson || '' : '');

        const formatForInput = (iso) => iso ? new Date(iso).toISOString().slice(0, 16) : '';
        setEntryDate(order?.entryDate ? formatForInput(order.entryDate) : formatForInput(new Date()));
        setStartDate(order?.startDate ? formatForInput(order.startDate) : '');
        setEndDate(order?.endDate ? formatForInput(order.endDate) : '');
        setDeliveryDate(order?.deliveryDate ? formatForInput(order.deliveryDate) : '');

        setEntryBy(order ? (order.entryBy || currentUser.name) : currentUser.name);
        setTechBy(order ? (order.techBy || order.assignedTech || '') : '');
        setDeliveredBy(order ? (order.deliveredBy || '') : '');

        setIsModalOpen(true);
    };

    const handleSave = (e) => {
        e.preventDefault();
        const isoDate = (local) => local ? new Date(local).toISOString() : null;

        let newStart = isoDate(startDate);
        let newEnd = isoDate(endDate);
        let newDelivery = isoDate(deliveryDate);

        if (status === 'andamento' && !newStart) newStart = new Date().toISOString();
        if (status === 'concluido' && !newEnd) newEnd = new Date().toISOString();
        if (status === 'retirado' && !newDelivery) newDelivery = new Date().toISOString();

        const newOrder = {
            id: editingOrder ? editingOrder.id : `OS-${Math.floor(1000 + Math.random() * 9000)}`,
            customer,
            clientName: customer,
            countryCode,
            phone,
            clientPhone: phone,
            device,
            deviceModel: device,
            problem,
            category,
            status,
            deviceImage,
            passwordType,
            devicePassword: passwordType === 'none' ? '' : devicePassword,
            patternLock: passwordType === 'pattern' && devicePassword ? devicePassword.split('-').map(Number) : [],
            leftCase,
            leftSimTray,
            leftSimCard,
            price: parseFloat(price) || 0,
            salePrice: parseFloat(price) || 0,
            discount: parseFloat(discount) || 0,
            paymentEntry,
            paymentExit,
            pickupPerson,
            entryDate: isoDate(entryDate),
            startDate: newStart,
            endDate: newEnd,
            deliveryDate: newDelivery,
            entryBy: entryBy || currentUser.name,
            techBy: techBy || '',
            assignedTech: techBy || currentUser.name,
            deliveredBy: deliveredBy || '',
            updatedBy: currentUser.name,
            updatedAt: new Date().toISOString()
        };

        if (editingOrder) {
            setOrders(prev => prev.map(o => o.id === newOrder.id ? newOrder : o));
        } else {
            setOrders(prev => [newOrder, ...prev]);
        }
        saveDocCloud('orders', newOrder.id, newOrder);
        playAppSound('success', appSettings.soundEnabled, appSettings.soundVolume);
        setIsModalOpen(false);
    };

    const deleteOrder = (id) => {
        if (window.confirm('Tem certeza que deseja excluir esta Ordem de Serviço permanentemente?')) {
            setOrders(prev => prev.filter(o => o.id !== id));
            deleteDocCloud('orders', id);
        }
    };

    const handleQuickStatusChange = (order, newStatus) => {
        const isoDate = new Date().toISOString();
        let updatedOrder = { ...order, status: newStatus, updatedBy: currentUser.name, updatedAt: isoDate };

        if (newStatus === 'andamento' && !order.startDate) updatedOrder.startDate = isoDate;
        if (newStatus === 'concluido' && !order.endDate) {
            updatedOrder.endDate = isoDate;
            if (!updatedOrder.techBy) updatedOrder.techBy = currentUser.name;
        }
        if (newStatus === 'retirado' && !order.deliveryDate) {
            updatedOrder.deliveryDate = isoDate;
            if (!updatedOrder.deliveredBy) updatedOrder.deliveredBy = currentUser.name;
        }

        setOrders(prev => prev.map(o => o.id === order.id ? updatedOrder : o));
        saveDocCloud('orders', order.id, updatedOrder);
        playAppSound('success', appSettings.soundEnabled, appSettings.soundVolume);
    };

    const openWhatsapp = (order) => {
        const ph = order.phone || order.clientPhone;
        if (!ph) {
            alert('Esta OS não possui telefone cadastrado.');
            return;
        }
        const cleanCountry = (order.countryCode || '+55').replace('+', '');
        const cleanPhone = ph.replace(/\D/g, '');
        const fullNumber = `${cleanCountry}${cleanPhone}`;
        const custName = order.customer || order.clientName;
        const devName = order.device || order.deviceModel;
        const text = encodeURIComponent(`Olá ${custName}, tudo bem? Aqui é da PlayCell! Estamos com seu aparelho (${devName}) com a OS #${order.id.slice(-6)}.`);
        window.open(`https://wa.me/${fullNumber}?text=${text}`, '_blank');
    };

    const formatDate = (iso) => {
        if (!iso) return '-';
        const d = new Date(iso);
        return `${d.toLocaleDateString('pt-BR')} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
    };

    const formatPayment = (val) => {
        const options = {
            'pix': 'Pix',
            'dinheiro': 'Dinheiro',
            'credito': 'Cartão de Crédito',
            'debito': 'Cartão de Débito',
            'pendente': 'Não Pago'
        };
        return options[val] || val;
    };

    const statusBadges = {
        'pendente': { label: '🚀 Pendente (Entrada)', bg: 'bg-slate-100 text-slate-700 border-slate-300' },
        'Em Aberto': { label: '🚀 Pendente (Entrada)', bg: 'bg-slate-100 text-slate-700 border-slate-300' },
        'andamento': { label: '🔧 Em Andamento', bg: 'bg-blue-100 text-blue-800 border-blue-300' },
        'Em Andamento': { label: '🔧 Em Andamento', bg: 'bg-blue-100 text-blue-800 border-blue-300' },
        'concluido': { label: '✅ Pronto (Aguardando)', bg: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
        'Pronto': { label: '✅ Pronto (Aguardando)', bg: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
        'retirado': { label: '📦 Entregue / Retirado', bg: 'bg-indigo-100 text-indigo-800 border-indigo-300' },
        'Entregue': { label: '📦 Entregue / Retirado', bg: 'bg-indigo-100 text-indigo-800 border-indigo-300' }
    };

    const filteredOrders = orders.filter(order => {
        const cust = order.customer || order.clientName || '';
        const dev = order.device || order.deviceModel || '';
        const ph = order.phone || order.clientPhone || '';
        const pick = order.pickupPerson || '';

        const matchesSearch =
            cust.toLowerCase().includes(searchTerm.toLowerCase()) ||
            dev.toLowerCase().includes(searchTerm.toLowerCase()) ||
            ph.includes(searchTerm) ||
            pick.toLowerCase().includes(searchTerm.toLowerCase()) ||
            order.id.toLowerCase().includes(searchTerm.toLowerCase());

        if (statusFilter === 'todos') return matchesSearch;
        if (statusFilter === 'pendente') return matchesSearch && (order.status === 'pendente' || order.status === 'Em Aberto');
        if (statusFilter === 'andamento') return matchesSearch && (order.status === 'andamento' || order.status === 'Em Andamento');
        if (statusFilter === 'concluido') return matchesSearch && (order.status === 'concluido' || order.status === 'Pronto');
        if (statusFilter === 'retirado') return matchesSearch && (order.status === 'retirado' || order.status === 'Entregue');

        return matchesSearch;
    });

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
                <div className="relative w-full md:w-80">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Buscar por cliente, aparelho, fone..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50"
                    />
                </div>

                <div className="w-full md:w-auto">
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="w-full md:w-64 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-xl px-3.5 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer transition-colors shadow-sm"
                    >
                        <option value="todos">📋 Mostrar Todos os Serviços ({orders.length})</option>
                        <option value="pendente">🚀 Entrada / Pendente ({orders.filter(o => o.status === 'pendente' || o.status === 'Em Aberto').length})</option>
                        <option value="andamento">🔧 Em Andamento ({orders.filter(o => o.status === 'andamento' || o.status === 'Em Andamento').length})</option>
                        <option value="concluido">✅ Pronto ({orders.filter(o => o.status === 'concluido' || o.status === 'Pronto').length})</option>
                        <option value="retirado">📦 Entregue / Retirado ({orders.filter(o => o.status === 'retirado' || o.status === 'Entregue').length})</option>
                    </select>
                </div>

                <button onClick={() => openModal()} className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2 rounded-xl shadow-md flex items-center space-x-2 transition-all shrink-0 text-xs">
                    <Plus className="w-4 h-4" /> <span>Nova OS</span>
                </button>
            </div>

            {filteredOrders.length === 0 ? (
                <div className="bg-white p-12 rounded-2xl text-center text-slate-400 border border-slate-200 shadow-sm">
                    <Wrench className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                    <h4 className="font-bold text-slate-700 text-base">Nenhuma Ordem de Serviço encontrada</h4>
                    <p className="text-xs text-slate-400 mt-1">Tente mudar o filtro ou cadastrar uma nova OS.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredOrders.map(order => {
                        const valPrice = parseFloat(order.price || order.salePrice || 0);
                        const valDiscount = parseFloat(order.discount || 0);
                        const finalTotal = Math.max(0, valPrice - valDiscount);
                        const badge = statusBadges[order.status] || statusBadges['pendente'];
                        const custName = order.customer || order.clientName;
                        const devName = order.device || order.deviceModel;
                        const phNumber = order.phone || order.clientPhone;

                        return (
                            <div key={order.id} className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 flex flex-col justify-between group relative hover:border-blue-300 transition-all">
                                <div>
                                    <div className="flex items-center justify-between mb-2">
                                        <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${badge.bg}`}>
                                            {badge.label}
                                        </span>

                                        <div className="flex items-center space-x-1">
                                            <button onClick={() => setPrintingOrder(order)} className="p-1.5 bg-slate-50 text-slate-600 rounded-lg hover:bg-slate-100" title="Imprimir OS"><Printer className="w-3.5 h-3.5" /></button>
                                            <button onClick={() => openModal(order)} className="p-1.5 bg-slate-50 text-blue-600 rounded-lg hover:bg-blue-100" title="Editar"><Edit2 className="w-3.5 h-3.5" /></button>
                                            <button onClick={() => deleteOrder(order.id)} className="p-1.5 bg-slate-50 text-red-600 rounded-lg hover:bg-red-100" title="Excluir"><Trash2 className="w-3.5 h-3.5" /></button>
                                        </div>
                                    </div>

                                    {order.deviceImage && (
                                        <div className="mb-3 h-28 w-full bg-slate-100 rounded-xl overflow-hidden border border-slate-200">
                                            <img src={order.deviceImage} alt={devName} className="w-full h-full object-cover" />
                                        </div>
                                    )}

                                    <div className="flex items-center justify-between">
                                        <span className="text-[10px] font-bold text-blue-600 uppercase bg-blue-50 px-2 py-0.5 rounded">{order.category || 'Serviço'}</span>
                                        <span className="text-[10px] font-mono font-bold text-slate-400">#{order.id.slice(-6)}</span>
                                    </div>

                                    <h4 className="font-bold text-slate-800 text-base mt-1 truncate">{custName}</h4>
                                    <p className="text-xs font-bold text-blue-600 mt-0.5">{devName}</p>

                                    {phNumber && (
                                        <div className="mt-2 flex items-center justify-between bg-slate-50 p-2 rounded-xl border border-slate-100">
                                            <div className="flex items-center space-x-1.5 text-xs text-slate-700 font-medium">
                                                <Phone className="w-3.5 h-3.5 text-slate-400" />
                                                <span>{order.countryCode || '+55'} {phNumber}</span>
                                            </div>
                                            <button
                                                onClick={() => openWhatsapp(order)}
                                                className="px-2.5 py-1 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-[11px] font-bold flex items-center space-x-1 shadow-sm transition-all"
                                            >
                                                <MessageSquare className="w-3.5 h-3.5" />
                                                <span>Conversar</span>
                                            </button>
                                        </div>
                                    )}

                                    <p className="text-xs text-slate-500 mt-2 line-clamp-2 bg-slate-50/50 p-2 rounded-lg border border-slate-100">{order.problem}</p>

                                    {(order.leftCase || order.leftSimTray || order.leftSimCard) && (
                                        <div className="mt-2.5 flex flex-wrap gap-1">
                                            {order.leftCase && <span className="text-[10px] bg-indigo-50 border border-indigo-200 text-indigo-700 px-2 py-0.5 rounded-md font-semibold">👜 Capinha</span>}
                                            {order.leftSimTray && <span className="text-[10px] bg-amber-50 border border-amber-200 text-amber-800 px-2 py-0.5 rounded-md font-semibold">📥 Gaveta SIM</span>}
                                            {order.leftSimCard && <span className="text-[10px] bg-emerald-50 border border-emerald-200 text-emerald-800 px-2 py-0.5 rounded-md font-semibold">📱 Chip SIM</span>}
                                        </div>
                                    )}

                                    {order.devicePassword && (
                                        <div className="mt-2.5 p-2 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between text-xs text-amber-900">
                                            <div className="flex items-center space-x-1.5 font-medium min-w-0 pr-1">
                                                <Key className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                                <span className="truncate">
                                                    {order.passwordType === 'pattern' ? `Padrão: ${order.devicePassword}` : `Senha: ${order.devicePassword}`}
                                                </span>
                                            </div>
                                            {order.passwordType === 'pattern' && (
                                                <PatternMiniVisualizer pattern={order.devicePassword} />
                                            )}
                                        </div>
                                    )}

                                    <div className="mt-3 pt-2 border-t border-slate-100 space-y-1 text-[11px]">
                                        {order.entryBy && (
                                            <div className="flex items-center text-slate-600">
                                                <span className="text-slate-400 font-medium mr-1">Entrada:</span>
                                                <span className="font-bold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded">{order.entryBy}</span>
                                            </div>
                                        )}
                                        {(order.techBy || order.assignedTech) && (
                                            <div className="flex items-center text-indigo-600">
                                                <span className="text-slate-400 font-medium mr-1">Técnico:</span>
                                                <span className="font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded">{order.techBy || order.assignedTech}</span>
                                            </div>
                                        )}
                                        {order.deliveredBy && (
                                            <div className="flex items-center text-emerald-600">
                                                <span className="text-slate-400 font-medium mr-1">Entregue por:</span>
                                                <span className="font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">{order.deliveredBy}</span>
                                            </div>
                                        )}
                                        {order.pickupPerson && (
                                            <div className="flex items-center text-purple-600">
                                                <span className="text-slate-400 font-medium mr-1">Retirado por:</span>
                                                <span className="font-bold text-purple-800 bg-purple-50 px-1.5 py-0.5 rounded">{order.pickupPerson}</span>
                                            </div>
                                        )}
                                    </div>

                                    {(valPrice > 0 || order.paymentEntry || order.paymentExit) && (
                                        <div className="mt-3 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                                            {valPrice > 0 && (
                                                <>
                                                    <div className="flex justify-between text-[11px] text-slate-500 mb-0.5">
                                                        <span>Serviço:</span> <span>R$ {valPrice.toFixed(2)}</span>
                                                    </div>
                                                    {valDiscount > 0 && (
                                                        <div className="flex justify-between text-[11px] text-red-500 mb-0.5">
                                                            <span>Desconto:</span> <span>- R$ {valDiscount.toFixed(2)}</span>
                                                        </div>
                                                    )}
                                                    <div className="flex justify-between text-xs font-bold text-slate-700 pt-1 mb-1 border-t border-slate-200">
                                                        <span>Total Final:</span> <span className="text-emerald-700 font-black">R$ {finalTotal.toFixed(2)}</span>
                                                    </div>
                                                </>
                                            )}

                                            {(order.paymentEntry || order.paymentExit) && (
                                                <div className="border-t border-slate-200 pt-1 mt-1 text-[10px] space-y-0.5">
                                                    {order.paymentEntry && (
                                                        <div className="flex justify-between text-slate-600">
                                                            <span>Pgto Sinal:</span> <span className="font-semibold">{formatPayment(order.paymentEntry)}</span>
                                                        </div>
                                                    )}
                                                    {order.paymentExit && (
                                                        <div className="flex justify-between text-slate-600">
                                                            <span>Pgto Final:</span> <span className="font-semibold">{formatPayment(order.paymentExit)}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                <div className="mt-4 pt-3 border-t border-slate-100">
                                    <select
                                        value={order.status}
                                        onChange={(e) => handleQuickStatusChange(order, e.target.value)}
                                        className="w-full text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-xl px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer transition-colors"
                                    >
                                        <option value="pendente">🚀 Entrada (Pendente)</option>
                                        <option value="andamento">🔧 Em Andamento</option>
                                        <option value="concluido">✅ Pronto</option>
                                        <option value="retirado">📦 Entregue / Retirado</option>
                                    </select>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {isModalOpen && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[95vh]">
                        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
                            <h3 className="font-bold text-lg text-slate-800">{editingOrder ? 'Editar Ordem de Serviço' : 'Nova Ordem de Serviço'}</h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
                        </div>

                        <form onSubmit={handleSave} className="p-6 overflow-y-auto space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1 uppercase">Cliente</label>
                                    <input type="text" required value={customer} onChange={(e) => setCustomer(e.target.value)} placeholder="Nome do cliente" className="w-full px-4 py-2 border rounded-xl text-sm" />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1 uppercase">Contato / Telefone (WhatsApp)</label>
                                    <div className="flex space-x-1.5">
                                        <select
                                            value={countryCode}
                                            onChange={(e) => setCountryCode(e.target.value)}
                                            className="px-2 py-2 border rounded-xl text-xs bg-slate-50 font-bold shrink-0 outline-none focus:ring-2 focus:ring-blue-500"
                                        >
                                            {COUNTRY_CODES.map(c => (
                                                <option key={c.code} value={c.code}>{c.flag} {c.code}</option>
                                            ))}
                                        </select>
                                        <input
                                            type="tel"
                                            value={phone}
                                            onChange={(e) => setPhone(e.target.value)}
                                            placeholder="(81) 99999-9999"
                                            className="w-full px-3 py-2 border rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1 uppercase">Aparelho / Modelo</label>
                                    <input type="text" required value={device} onChange={(e) => setDevice(e.target.value)} placeholder="Ex: iPhone 13, Moto G60..." className="w-full px-4 py-2 border rounded-xl text-sm" />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1 uppercase">Tipo de Serviço / Categoria</label>
                                    <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full px-3 py-2 border rounded-xl text-sm bg-white">
                                        {['Telas', 'Baterias', 'Placas', 'Conectores', 'Carcaças', 'Acessórios', 'Outros'].map(c => (
                                            <option key={c} value={c}>{c}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* NOVO: Usando o Botão para Câmera Direta */}
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1 uppercase">Foto do Aparelho (Opcional)</label>
                                <div className="flex space-x-2">
                                    <input type="url" value={deviceImage} onChange={(e) => setDeviceImage(e.target.value)} placeholder="http..." className="w-full px-3 py-2 border rounded-xl text-sm" />
                                    <button
                                        type="button"
                                        onClick={handleDeviceImageUpload}
                                        className="flex items-center justify-center px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-200 rounded-xl cursor-pointer shrink-0 transition-colors"
                                    >
                                        <span className="text-xs font-bold">📷 Câmera</span>
                                    </button>
                                </div>
                            </div>

                            {deviceImage && (
                                <div className="relative w-20 h-20 rounded-xl overflow-hidden border border-slate-200 group">
                                    <img src={deviceImage} alt="Aparelho" className="w-full h-full object-cover" />
                                    <button type="button" onClick={() => setDeviceImage('')} className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 shadow hover:bg-red-600">
                                        <X className="w-3 h-3" />
                                    </button>
                                </div>
                            )}

                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1 uppercase">Defeito Relatado</label>
                                <textarea required rows="2" value={problem} onChange={(e) => setProblem(e.target.value)} className="w-full px-4 py-2 border rounded-xl text-sm resize-none" />
                            </div>

                            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                                <label className="block text-xs font-bold text-slate-700 mb-2 uppercase flex items-center space-x-1">
                                    <Package className="w-4 h-4 text-blue-600" />
                                    <span>Acessórios Deixados pelo Cliente</span>
                                </label>
                                <div className="grid grid-cols-3 gap-3 text-xs font-medium text-slate-700">
                                    <label className="flex items-center space-x-2 cursor-pointer p-2 bg-white rounded-lg border border-slate-200 hover:bg-blue-50/50">
                                        <input
                                            type="checkbox"
                                            checked={leftCase}
                                            onChange={(e) => setLeftCase(e.target.checked)}
                                            className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
                                        />
                                        <span>Capinha</span>
                                    </label>

                                    <label className="flex items-center space-x-2 cursor-pointer p-2 bg-white rounded-lg border border-slate-200 hover:bg-blue-50/50">
                                        <input
                                            type="checkbox"
                                            checked={leftSimTray}
                                            onChange={(e) => handleSimTrayToggle(e.target.checked)}
                                            className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
                                        />
                                        <span>Gaveta de Chip</span>
                                    </label>

                                    <label className="flex items-center space-x-2 cursor-pointer p-2 bg-white rounded-lg border border-slate-200 hover:bg-blue-50/50">
                                        <input
                                            type="checkbox"
                                            checked={leftSimCard}
                                            onChange={(e) => handleSimCardToggle(e.target.checked)}
                                            className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
                                        />
                                        <span>Chip SIM</span>
                                    </label>
                                </div>
                            </div>

                            <div className="bg-amber-50/60 p-4 rounded-xl border border-amber-200 space-y-3">
                                <div className="flex justify-between items-center">
                                    <label className="block text-xs font-bold text-amber-900 uppercase flex items-center space-x-1">
                                        <Key className="w-4 h-4 text-amber-600" /> <span>Senha de Acesso ao Aparelho</span>
                                    </label>
                                    <div className="flex space-x-1 bg-white p-1 rounded-lg border border-amber-200 text-xs font-bold">
                                        <button
                                            type="button"
                                            onClick={() => { setPasswordType('none'); setDevicePassword(''); }}
                                            className={`px-2.5 py-1 rounded-md transition-all ${passwordType === 'none' ? 'bg-amber-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'}`}
                                        >
                                            Sem Senha
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setPasswordType('text')}
                                            className={`px-2.5 py-1 rounded-md transition-all ${passwordType === 'text' ? 'bg-amber-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'}`}
                                        >
                                            PIN / Texto
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setPasswordType('pattern')}
                                            className={`px-2.5 py-1 rounded-md transition-all ${passwordType === 'pattern' ? 'bg-amber-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'}`}
                                        >
                                            Padrão 3x3
                                        </button>
                                    </div>
                                </div>

                                {passwordType === 'text' && (
                                    <input
                                        type="text"
                                        value={devicePassword}
                                        onChange={(e) => setDevicePassword(e.target.value)}
                                        placeholder="Ex: 1234, ABCD, PIN do chip..."
                                        className="w-full px-4 py-2 border border-amber-300 rounded-xl text-sm bg-white focus:ring-2 focus:ring-amber-500 outline-none"
                                    />
                                )}

                                {passwordType === 'pattern' && (
                                    <PatternInteractivePicker value={devicePassword} onChange={setDevicePassword} />
                                )}
                            </div>

                            <div className="bg-indigo-50/70 p-4 rounded-xl border border-indigo-100 space-y-3">
                                <span className="block text-xs font-bold text-indigo-900 uppercase flex items-center space-x-1">
                                    <Users className="w-4 h-4 text-indigo-600" />
                                    <span>Colaboradores Responsáveis</span>
                                </span>

                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                    <div>
                                        <label className="block text-[11px] font-bold text-slate-600 mb-1">1. Entrada Feita Por:</label>
                                        <select value={entryBy} onChange={(e) => setEntryBy(e.target.value)} className="w-full px-3 py-1.5 border rounded-lg text-xs bg-white font-medium">
                                            <option value="">Selecione...</option>
                                            {approvedUsers.map(u => <option key={u.id} value={u.name}>{u.name}</option>)}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-[11px] font-bold text-slate-600 mb-1">2. Técnico do Reparo:</label>
                                        <select value={techBy} onChange={(e) => setTechBy(e.target.value)} className="w-full px-3 py-1.5 border rounded-lg text-xs bg-white font-medium">
                                            <option value="">Selecione...</option>
                                            {approvedUsers.map(u => <option key={u.id} value={u.name}>{u.name}</option>)}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-[11px] font-bold text-slate-600 mb-1">3. Entregue Por:</label>
                                        <select value={deliveredBy} onChange={(e) => setDeliveredBy(e.target.value)} className="w-full px-3 py-1.5 border rounded-lg text-xs bg-white font-medium">
                                            <option value="">Selecione...</option>
                                            {approvedUsers.map(u => <option key={u.id} value={u.name}>{u.name}</option>)}
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1 uppercase">Status</label>
                                    <select value={status} onChange={(e) => setStatus(e.target.value)} className="w-full px-3 py-2 border rounded-xl text-sm bg-white">
                                        <option value="pendente">Entrada (Pendente)</option>
                                        <option value="andamento">Em Andamento</option>
                                        <option value="concluido">Pronto</option>
                                        <option value="retirado">Retirado / Entregue</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1 uppercase">Valor Serviço (R$)</label>
                                    <input type="number" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} className="w-full px-3 py-2 border rounded-xl text-sm" placeholder="Ex: 250.00" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1 uppercase">Desconto (R$)</label>
                                    <input type="number" step="0.01" value={discount} onChange={(e) => setDiscount(e.target.value)} className="w-full px-3 py-2 border rounded-xl text-sm text-red-600" placeholder="Ex: 25.00" />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-blue-50/50 p-4 rounded-xl border border-blue-100">
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1 uppercase">Pgto (Entrada/Sinal)</label>
                                    <select value={paymentEntry} onChange={(e) => setPaymentEntry(e.target.value)} className="w-full px-3 py-2 border rounded-xl text-xs bg-white">
                                        <option value="">Selecione...</option>
                                        <option value="pix">Pix</option>
                                        <option value="dinheiro">Dinheiro</option>
                                        <option value="credito">Cartão de Crédito</option>
                                        <option value="debito">Cartão de Débito</option>
                                        <option value="pendente">Não Pago</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1 uppercase">Pgto (Retirada)</label>
                                    <select value={paymentExit} onChange={(e) => setPaymentExit(e.target.value)} className="w-full px-3 py-2 border rounded-xl text-xs bg-white">
                                        <option value="">Selecione...</option>
                                        <option value="pix">Pix</option>
                                        <option value="dinheiro">Dinheiro</option>
                                        <option value="credito">Cartão de Crédito</option>
                                        <option value="debito">Cartão de Débito</option>
                                        <option value="pendente">Não Pago</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1 uppercase">Pessoa que Retirou (Opcional)</label>
                                    <input
                                        type="text"
                                        value={pickupPerson}
                                        onChange={(e) => setPickupPerson(e.target.value)}
                                        placeholder="Ex: Mãe, Irmão, Maria..."
                                        className="w-full px-3 py-2 border rounded-xl text-xs bg-white"
                                    />
                                </div>
                            </div>

                            <div className="pt-4 border-t border-slate-100 flex justify-end">
                                <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-8 py-3 rounded-xl shadow-md">Salvar Ordem</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {printingOrder && (
                <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <style>{`
            @media print {
              body * { visibility: hidden !important; }
              #printable-os-area, #printable-os-area * { visibility: visible !important; }
              #printable-os-area { 
                position: absolute; 
                left: 0; 
                top: 0; 
                width: 100%; 
                padding: 24px; 
                font-size: 24px !important;
                line-height: 1.5 !important;
                color: #000 !important;
              }
              #printable-os-area h2 { font-size: 32px !important; font-weight: 900 !important; }
              #printable-os-area h3 { font-size: 26px !important; font-weight: 800 !important; }
              #printable-os-area p, 
              #printable-os-area span, 
              #printable-os-area div, 
              #printable-os-area td { font-size: 24px !important; }
              .no-print { display: none !important; }
            }
          `}</style>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden flex flex-col max-h-[95vh]">
                        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-900 text-white no-print">
                            <div className="flex items-center space-x-2">
                                <Printer className="w-5 h-5 text-blue-400" />
                                <h3 className="font-bold text-base">Imprimir Ordem de Serviço</h3>
                            </div>
                            <button onClick={() => setPrintingOrder(null)} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
                        </div>

                        <div className="p-6 overflow-y-auto space-y-6 text-slate-800" id="printable-os-area">
                            <div className="flex justify-between items-start border-b border-slate-200 pb-4">
                                <div>
                                    <div className="flex items-center space-x-2">
                                        <div className="bg-blue-600 text-white p-1.5 rounded-lg font-bold"><Wrench className="w-5 h-5" /></div>
                                        <h2 className="text-xl font-black text-slate-900 tracking-tight">PlayCell Manager</h2>
                                    </div>
                                    <p className="text-xs text-slate-500 mt-1">Assistência Técnica Especializada</p>
                                </div>
                                <div className="text-right">
                                    <span className="text-xs font-bold uppercase text-slate-400 block">ORDEM DE SERVIÇO</span>
                                    <span className="text-lg font-black text-blue-600">#{printingOrder.id.slice(-6)}</span>
                                    <p className="text-[11px] text-slate-500 mt-0.5">{formatDate(printingOrder.entryDate)}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
                                <div>
                                    <span className="font-bold text-slate-400 uppercase text-[10px] block mb-0.5">Cliente</span>
                                    <p className="font-bold text-slate-800 text-sm">{printingOrder.customer || printingOrder.clientName}</p>
                                    {(printingOrder.phone || printingOrder.clientPhone) && (
                                        <p className="text-[11px] text-slate-500">{printingOrder.countryCode || '+55'} {printingOrder.phone || printingOrder.clientPhone}</p>
                                    )}
                                </div>
                                <div>
                                    <span className="font-bold text-slate-400 uppercase text-[10px] block mb-0.5">Aparelho / Modelo</span>
                                    <p className="font-bold text-indigo-700 text-sm">{printingOrder.device || printingOrder.deviceModel}</p>
                                </div>
                            </div>

                            {(printingOrder.leftCase || printingOrder.leftSimTray || printingOrder.leftSimCard) && (
                                <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl text-xs">
                                    <span className="font-bold text-blue-900 uppercase text-[10px] block mb-1">Acessórios Deixados</span>
                                    <div className="flex gap-2">
                                        {printingOrder.leftCase && <span className="font-bold text-slate-700">• Capinha</span>}
                                        {printingOrder.leftSimTray && <span className="font-bold text-slate-700">• Gaveta SIM</span>}
                                        {printingOrder.leftSimCard && <span className="font-bold text-slate-700">• Chip SIM</span>}
                                    </div>
                                </div>
                            )}

                            <div className="space-y-3">
                                <div className="p-3 bg-white border border-slate-200 rounded-xl text-xs">
                                    <span className="font-bold text-slate-500 uppercase text-[10px] block mb-1">Defeito Relatado</span>
                                    <p className="text-slate-800 font-medium">{printingOrder.problem}</p>
                                </div>

                                {printingOrder.devicePassword && (
                                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs flex justify-between items-center">
                                        <div>
                                            <span className="font-bold text-amber-900 uppercase text-[10px] block">Senha do Aparelho</span>
                                            <p className="font-bold text-amber-800 text-sm mt-0.5">
                                                {printingOrder.passwordType === 'pattern' ? `Desenho Padrão: ${printingOrder.devicePassword}` : printingOrder.devicePassword}
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {printingOrder.pickupPerson && (
                                <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl text-xs">
                                    <span className="font-bold text-purple-900 uppercase text-[10px] block">Aparelho Retirado Por</span>
                                    <p className="font-bold text-purple-800 text-sm mt-0.5">{printingOrder.pickupPerson}</p>
                                </div>
                            )}

                            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs space-y-1.5">
                                <div className="flex justify-between text-slate-600">
                                    <span>Valor do Serviço:</span>
                                    <span className="font-semibold">R$ {(parseFloat(printingOrder.price || printingOrder.salePrice || 0)).toFixed(2)}</span>
                                </div>
                                {printingOrder.discount > 0 && (
                                    <div className="flex justify-between text-red-600">
                                        <span>Desconto Concedido:</span>
                                        <span className="font-semibold">- R$ {parseFloat(printingOrder.discount).toFixed(2)}</span>
                                    </div>
                                )}
                                <div className="flex justify-between text-sm font-bold text-slate-900 pt-2 border-t border-slate-200">
                                    <span>Total Final:</span>
                                    <span className="text-emerald-700 font-black">R$ {Math.max(0, (parseFloat(printingOrder.price || printingOrder.salePrice || 0)) - (parseFloat(printingOrder.discount || 0))).toFixed(2)}</span>
                                </div>
                            </div>

                            <div className="pt-8 border-t border-slate-200 grid grid-cols-2 gap-8 text-center text-[10px] text-slate-500">
                                <div>
                                    <div className="border-b border-slate-300 mb-1"></div>
                                    <span>Assinatura do Técnico / Loja</span>
                                </div>
                                <div>
                                    <div className="border-b border-slate-300 mb-1"></div>
                                    <span>Assinatura do Cliente</span>
                                </div>
                            </div>
                        </div>

                        <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end space-x-3 no-print">
                            <button
                                onClick={() => setPrintingOrder(null)}
                                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl text-sm"
                            >
                                Fechar
                            </button>
                            <button
                                onClick={() => window.print()}
                                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-sm shadow-md flex items-center space-x-2"
                            >
                                <Printer className="w-4 h-4" />
                                <span>Imprimir Comprovante</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function InventoryTab({ inventory, setInventory, shoppingList, setShoppingList, currentUser, saveDocCloud, deleteDocCloud }) {
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState(null);

    const [name, setName] = useState('');
    const [category, setCategory] = useState('Telas');
    const [costPrice, setCostPrice] = useState('');
    const [price, setPrice] = useState('');
    const [quantity, setQuantity] = useState('');
    const [minStock, setMinStock] = useState('2');
    const [imageUrl, setImageUrl] = useState('');

    const openModal = (item = null) => {
        setEditingItem(item);
        setName(item ? item.name : '');
        setCategory(item ? item.category || 'Telas' : 'Telas');
        setCostPrice(item ? (item.costPrice || '') : '');
        setPrice(item ? (item.price || item.salePrice || '') : '');
        setQuantity(item ? item.quantity : '');
        setMinStock(item ? (item.minStock || item.minQuantity || '2') : '2');
        setImageUrl(item ? item.imageUrl || '' : '');
        setIsModalOpen(true);
    };

    const handleSave = (e) => {
        e.preventDefault();
        const newItem = {
            id: editingItem ? editingItem.id : Date.now().toString(),
            name,
            category,
            costPrice: parseFloat(costPrice) || 0,
            price: parseFloat(price) || 0,
            salePrice: parseFloat(price) || 0,
            quantity: parseInt(quantity) || 0,
            minStock: parseInt(minStock) || 2,
            minQuantity: parseInt(minStock) || 2,
            imageUrl,
            updatedBy: currentUser.name,
            createdAt: editingItem ? (editingItem.createdAt || new Date().toISOString()) : new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        if (editingItem) {
            setInventory(prev => prev.map(item => item.id === newItem.id ? newItem : item));
        } else {
            setInventory(prev => [...prev, newItem]);
        }
        saveDocCloud('inventory', newItem.id, newItem);
        setIsModalOpen(false);
    };

    const deleteItem = (id) => {
        if (window.confirm('Excluir esta peça do estoque?')) {
            setInventory(prev => prev.filter(item => item.id !== id));
            deleteDocCloud('inventory', id);
        }
    };

    const updateQuantity = (id, delta) => {
        setInventory(prev => prev.map(item => {
            if (item.id === id) {
                const updated = { ...item, quantity: Math.max(0, parseInt(item.quantity) + delta), updatedBy: currentUser.name, updatedAt: new Date().toISOString() };
                saveDocCloud('inventory', item.id, updated);
                return updated;
            }
            return item;
        }));
    };

    const addToShoppingList = (item) => {
        const qtyToAdd = prompt(`Quantas unidades de "${item.name}" deseja pedir?`, "1");
        if (qtyToAdd && parseInt(qtyToAdd) > 0) {
            const shopItem = {
                id: Date.now().toString(),
                name: item.name,
                category: item.category,
                quantity: parseInt(qtyToAdd),
                addedBy: currentUser.name,
                checked: false
            };
            setShoppingList(prev => [...prev, shopItem]);
            saveDocCloud('shoppingList', shopItem.id, shopItem);
            alert("Adicionado à lista de compras!");
        }
    };

    // =======================================================
    // ATUALIZADO: Uso do botão para chamar a função global
    // =======================================================
    const handleImageUpload = async () => {
        try {
            const fotoNativa = await tirarFotoComCamera();
            if (fotoNativa) {
                setImageUrl(fotoNativa);
            }
        } catch (err) {
            console.log('Erro ao capturar foto', err);
        }
    };

    const filtered = inventory.filter(item => item.name.toLowerCase().includes(searchTerm.toLowerCase()));

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between gap-4">
                <div className="relative w-full max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Buscar peça..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none shadow-sm bg-white text-sm"
                    />
                </div>
                <button onClick={() => openModal()} className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2.5 rounded-xl shadow-md flex items-center justify-center space-x-2 transition-all text-sm shrink-0">
                    <Plus className="w-5 h-5" /> <span>Nova Peça</span>
                </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {filtered.map(item => {
                    const min = item.minStock || item.minQuantity || 2;
                    const itemPrice = parseFloat(item.price || item.salePrice || 0);
                    return (
                        <div key={item.id} className={`bg-white rounded-2xl shadow-sm border ${item.quantity <= min ? 'border-red-300' : 'border-slate-200'} overflow-hidden flex flex-col group relative`}>
                            <div className="h-32 bg-slate-100 relative group-hover:opacity-90 transition-opacity">
                                {item.imageUrl ? (
                                    <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-slate-300"><ImageIcon className="w-10 h-10" /></div>
                                )}
                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => openModal(item)} className="p-2 bg-white rounded-full hover:bg-blue-50 text-blue-600 shadow-md"><Edit2 className="w-4 h-4" /></button>
                                    <button onClick={() => deleteItem(item.id)} className="p-2 bg-white rounded-full hover:bg-red-50 text-red-600 shadow-md"><Trash2 className="w-4 h-4" /></button>
                                    <button onClick={() => addToShoppingList(item)} className="p-2 bg-white rounded-full hover:bg-emerald-50 text-emerald-600 shadow-md" title="Adicionar à Lista de Compras"><ShoppingCart className="w-4 h-4" /></button>
                                </div>
                            </div>

                            <div className="p-4 flex-1 flex flex-col">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 mb-1">{item.category || 'Outros'}</span>
                                <h3 className="font-bold text-slate-800 text-sm mb-2 line-clamp-2 leading-tight">{item.name}</h3>

                                <div className="flex items-baseline justify-between mt-auto">
                                    <div className="text-lg font-black text-slate-700">R$ {itemPrice.toFixed(2)}</div>
                                    {item.costPrice > 0 && (
                                        <div className="text-[10px] text-slate-400 font-medium">Custo: R$ {parseFloat(item.costPrice).toFixed(2)}</div>
                                    )}
                                </div>

                                <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100">
                                    <div className="flex flex-col">
                                        <span className="text-xs text-slate-500 font-medium">Estoque</span>
                                        <span className={`font-bold ${item.quantity <= min ? 'text-red-600' : 'text-emerald-600'}`}>{item.quantity} un.</span>
                                    </div>
                                    <div className="flex items-center space-x-1 bg-slate-50 p-1 rounded-lg border border-slate-200">
                                        <button onClick={() => updateQuantity(item.id, -1)} className="w-7 h-7 flex items-center justify-center bg-white rounded shadow-sm text-slate-600 hover:bg-red-50 hover:text-red-600 font-bold">-</button>
                                        <button onClick={() => updateQuantity(item.id, 1)} className="w-7 h-7 flex items-center justify-center bg-white rounded shadow-sm text-slate-600 hover:bg-blue-50 hover:text-blue-600 font-bold">+</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
                            <h3 className="font-bold text-lg text-slate-800">{editingItem ? 'Editar Peça' : 'Nova Peça'}</h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
                        </div>

                        <form onSubmit={handleSave} className="p-6 space-y-4 overflow-y-auto text-xs">
                            <div>
                                <label className="block font-bold uppercase mb-1">Nome da Peça</label>
                                <input type="text" required value={name} onChange={(e) => setName(e.target.value)} className="w-full p-2.5 border rounded-xl text-sm" />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block font-bold uppercase mb-1">Categoria</label>
                                    <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full p-2.5 border rounded-xl bg-white text-sm">
                                        {['Telas', 'Baterias', 'Placas', 'Conectores', 'Carcaças', 'Acessórios', 'Ferramentas', 'Outros'].map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block font-bold uppercase mb-1">Preço Custo (R$)</label>
                                    <input type="number" step="0.01" value={costPrice} onChange={(e) => setCostPrice(e.target.value)} placeholder="0.00" className="w-full p-2.5 border rounded-xl text-sm" />
                                </div>
                                <div>
                                    <label className="block font-bold uppercase mb-1">Preço Venda (R$)</label>
                                    <input type="number" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} className="w-full p-2.5 border rounded-xl text-sm" />
                                </div>
                                <div>
                                    <label className="block font-bold uppercase mb-1">Qtd. Atual</label>
                                    <input type="number" required value={quantity} onChange={(e) => setQuantity(e.target.value)} className="w-full p-2.5 border rounded-xl text-sm" />
                                </div>
                            </div>
                            <div>
                                <label className="block font-bold uppercase mb-1">Alerta Mínimo de Estoque</label>
                                <input type="number" required value={minStock} onChange={(e) => setMinStock(e.target.value)} className="w-full p-2.5 border rounded-xl text-sm" />
                            </div>

                            {/* NOVO: Usando o botão para Câmera do Capacitor */}
                            <div>
                                <label className="block font-bold uppercase mb-1">Foto (Anexo ou Link)</label>
                                <div className="flex space-x-2">
                                    <input type="url" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="http..." className="w-full p-2.5 border rounded-xl text-xs" />
                                    <button
                                        type="button"
                                        onClick={handleImageUpload}
                                        className="flex items-center justify-center px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-200 rounded-xl cursor-pointer shrink-0 transition-colors"
                                    >
                                        <span className="text-xs font-bold">📷 Câmera</span>
                                    </button>
                                </div>
                                {imageUrl && <img src={imageUrl} alt="Preview" className="h-20 mt-2 rounded-xl object-cover border" />}
                            </div>

                            <div className="pt-4 flex justify-end space-x-2">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 bg-slate-100 rounded-xl font-bold">Cancelar</button>
                                <button type="submit" className="px-6 py-2 bg-blue-600 text-white rounded-xl font-bold shadow-md">Salvar</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

function FilmsTab({ filmsList, setFilmsList, currentUser, saveDocCloud, deleteDocCloud }) {
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingFilm, setEditingFilm] = useState(null);

    const [phoneModel, setPhoneModel] = useState('');
    const [compatibleWith, setCompatibleWith] = useState('');
    const [filmType, setFilmType] = useState('3D Vidro');
    const [notes, setNotes] = useState('');

    const openModal = (film = null) => {
        setEditingFilm(film);
        setPhoneModel(film ? film.phoneModel : '');
        setCompatibleWith(film ? film.compatibleWith : '');
        setFilmType(film ? film.filmType || '3D Vidro' : '3D Vidro');
        setNotes(film ? film.notes || '' : '');
        setIsModalOpen(true);
    };

    const handleSave = (e) => {
        e.preventDefault();
        const newFilm = {
            id: editingFilm ? editingFilm.id : Date.now().toString(),
            phoneModel,
            compatibleWith,
            filmType,
            notes,
            updatedBy: currentUser.name,
            updatedAt: new Date().toISOString()
        };

        if (editingFilm) {
            setFilmsList(prev => prev.map(f => f.id === newFilm.id ? newFilm : f));
        } else {
            setFilmsList(prev => [...prev, newFilm]);
        }
        saveDocCloud('filmsList', newFilm.id, newFilm);
        setIsModalOpen(false);
    };

    const deleteFilm = (id) => {
        if (window.confirm('Excluir esta película compatível da lista?')) {
            setFilmsList(prev => prev.filter(f => f.id !== id));
            deleteDocCloud('filmsList', id);
        }
    };

    const filtered = filmsList.filter(f =>
        f.phoneModel.toLowerCase().includes(searchTerm.toLowerCase()) ||
        f.compatibleWith.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between gap-4">
                <div className="relative w-full max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Pesquisar modelo de celular..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>
                <button onClick={() => openModal()} className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2.5 rounded-xl shadow-md flex items-center justify-center space-x-2 text-sm shrink-0">
                    <Plus className="w-5 h-5" /> <span>Cadastrar Compatibilidade</span>
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filtered.map(film => (
                    <div key={film.id} className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 flex flex-col justify-between group relative hover:border-blue-300 transition-colors">
                        <div className="absolute top-4 right-4 flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => openModal(film)} className="p-1.5 bg-slate-50 text-blue-600 rounded-lg hover:bg-blue-100"><Edit2 className="w-4 h-4" /></button>
                            <button onClick={() => deleteFilm(film.id)} className="p-1.5 bg-slate-50 text-red-600 rounded-lg hover:bg-red-100"><Trash2 className="w-4 h-4" /></button>
                        </div>

                        <div>
                            <span className="text-[10px] font-bold uppercase text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200 mb-2 inline-block">
                                {film.filmType || 'Película'}
                            </span>
                            <h3 className="font-black text-slate-800 text-base mb-3">{film.phoneModel}</h3>

                            <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-1">
                                <span className="text-[10px] font-bold text-emerald-800 uppercase block">Compatível Com:</span>
                                <p className="font-bold text-emerald-900 text-sm">{film.compatibleWith}</p>
                            </div>

                            {film.notes && <p className="text-xs text-slate-500 mt-2 italic">Obs: {film.notes}</p>}
                        </div>
                    </div>
                ))}
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 space-y-4">
                        <h3 className="font-bold text-slate-800">{editingFilm ? 'Editar Película' : 'Nova Película Compatível'}</h3>
                        <form onSubmit={handleSave} className="space-y-3 text-xs">
                            <div>
                                <label className="block font-bold uppercase mb-1">Modelo de Origem</label>
                                <input type="text" required value={phoneModel} onChange={(e) => setPhoneModel(e.target.value)} placeholder="Ex: iPhone 11" className="w-full p-2.5 border rounded-xl" />
                            </div>

                            <div>
                                <label className="block font-bold uppercase mb-1">Compatível Com (Serve em)</label>
                                <textarea required rows="2" value={compatibleWith} onChange={(e) => setCompatibleWith(e.target.value)} placeholder="Ex: iPhone XR" className="w-full p-2.5 border rounded-xl resize-none" />
                            </div>

                            <div>
                                <label className="block font-bold uppercase mb-1">Tipo de Película</label>
                                <select value={filmType} onChange={(e) => setFilmType(e.target.value)} className="w-full p-2.5 border rounded-xl bg-white">
                                    {['3D Vidro', '5D / 9D Armored', 'Privacidade', 'Hidrogel / TPU', 'Cerâmica / Fosca', 'Outra'].map(t => (
                                        <option key={t} value={t}>{t}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block font-bold uppercase mb-1">Observações</label>
                                <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full p-2.5 border rounded-xl" />
                            </div>

                            <div className="pt-3 flex justify-end space-x-2">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 bg-slate-100 rounded-xl font-bold">Cancelar</button>
                                <button type="submit" className="px-6 py-2 bg-blue-600 text-white rounded-xl font-bold shadow-md">Salvar</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

function OrderedPartsTab({ orderedParts, setOrderedParts, usersList, currentUser, saveDocCloud, deleteDocCloud }) {
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingPart, setEditingPart] = useState(null);

    const [partName, setPartName] = useState('');
    const [supplier, setSupplier] = useState('');
    const [orderDate, setOrderDate] = useState('');
    const [costPrice, setCostPrice] = useState('');
    const [sellPrice, setSellPrice] = useState('');
    const [discount, setDiscount] = useState('');
    const [soldBy, setSoldBy] = useState('');

    const approvedUsers = usersList.filter(u => u.role === 'admin' || u.role === 'funcionario');

    const openModal = (part = null) => {
        setEditingPart(part);
        setPartName(part ? (part.partName || part.name || '') : '');
        setSupplier(part ? part.supplier || '' : '');

        const todayStr = new Date().toISOString().slice(0, 10);
        setOrderDate(part ? (part.orderDate || todayStr) : todayStr);

        setCostPrice(part ? (part.costPrice || part.cost || '') : '');
        setSellPrice(part ? part.sellPrice || '' : '');
        setDiscount(part ? part.discount || '' : '');
        setSoldBy(part ? (part.soldBy || currentUser.name) : currentUser.name);
        setIsModalOpen(true);
    };

    const handleSave = (e) => {
        e.preventDefault();
        const newPart = {
            id: editingPart ? editingPart.id : Date.now().toString(),
            partName,
            supplier,
            orderDate,
            costPrice: parseFloat(costPrice) || 0,
            cost: parseFloat(costPrice) || 0,
            sellPrice: parseFloat(sellPrice) || 0,
            discount: parseFloat(discount) || 0,
            soldBy: soldBy || currentUser.name,
            createdBy: currentUser.name,
            createdAt: new Date().toISOString()
        };

        if (editingPart) {
            setOrderedParts(prev => prev.map(p => p.id === newPart.id ? newPart : p));
        } else {
            setOrderedParts(prev => [...prev, newPart]);
        }
        saveDocCloud('orderedParts', newPart.id, newPart);
        setIsModalOpen(false);
    };

    const deletePart = (id) => {
        if (window.confirm('Deseja remover esta peça pedida?')) {
            setOrderedParts(prev => prev.filter(p => p.id !== id));
            deleteDocCloud('orderedParts', id);
        }
    };

    const totalCost = orderedParts.reduce((acc, item) => acc + (parseFloat(item.costPrice || item.cost || 0)), 0);
    const totalGrossRevenue = orderedParts.reduce((acc, item) => acc + Math.max(0, (parseFloat(item.sellPrice || 0)) - (parseFloat(item.discount || 0))), 0);
    const totalNetProfit = totalGrossRevenue - totalCost;

    const filtered = orderedParts.filter(item => {
        const pName = item.partName || item.name || '';
        const supp = item.supplier || '';
        const seller = item.soldBy || '';
        return (
            pName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            supp.toLowerCase().includes(searchTerm.toLowerCase()) ||
            seller.toLowerCase().includes(searchTerm.toLowerCase())
        );
    });

    const formatDate = (dateStr) => {
        if (!dateStr) return '-';
        const parts = dateStr.split('-');
        if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
        return dateStr;
    };

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center space-x-4">
                    <div className="p-3 bg-amber-50 text-amber-600 rounded-xl shrink-0">
                        <DollarSign className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Total Investido (Custo)</p>
                        <p className="text-xl font-black text-slate-800 mt-0.5">R$ {totalCost.toFixed(2)}</p>
                    </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center space-x-4">
                    <div className="p-3 bg-blue-50 text-blue-600 rounded-xl shrink-0">
                        <TrendingUp className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Venda Estimada (c/ Desconto)</p>
                        <p className="text-xl font-black text-blue-600 mt-0.5">R$ {totalGrossRevenue.toFixed(2)}</p>
                    </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center space-x-4">
                    <div className={`p-3 rounded-xl shrink-0 ${totalNetProfit >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                        <DollarSign className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Lucro Líquido Previsto</p>
                        <p className={`text-xl font-black mt-0.5 ${totalNetProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                            R$ {totalNetProfit.toFixed(2)}
                        </p>
                    </div>
                </div>
            </div>

            <div className="flex flex-col sm:flex-row justify-between gap-4">
                <div className="relative w-full max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Buscar peça, fornecedor ou vendedor..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none shadow-sm bg-white text-sm"
                    />
                </div>

                <button onClick={() => openModal()} className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2.5 rounded-xl shadow-md flex items-center justify-center space-x-2 text-sm shrink-0">
                    <Plus className="w-5 h-5" /> <span>Pedir Peça</span>
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filtered.map(part => {
                    const costVal = parseFloat(part.costPrice || part.cost || 0);
                    const sellVal = parseFloat(part.sellPrice || 0);
                    const discVal = parseFloat(part.discount || 0);
                    const netVal = Math.max(0, sellVal - discVal) - costVal;

                    return (
                        <div key={part.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3 relative group hover:border-blue-300 transition-colors">
                            <div className="flex justify-between items-start">
                                <h4 className="font-bold text-slate-800 text-sm">{part.partName || part.name}</h4>
                                <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => openModal(part)} className="p-1 bg-slate-100 text-blue-600 rounded-lg hover:bg-blue-100"><Edit2 className="w-3.5 h-3.5" /></button>
                                    <button onClick={() => deletePart(part.id)} className="p-1 bg-slate-100 text-red-600 rounded-lg hover:bg-red-100"><Trash2 className="w-3.5 h-3.5" /></button>
                                </div>
                            </div>

                            <div className="text-xs text-slate-500 space-y-1 bg-slate-50 p-3 rounded-xl border border-slate-100">
                                <p>Fornecedor: <strong className="text-slate-800">{part.supplier || 'N/A'}</strong></p>
                                <p>Data Pedido: <strong className="text-slate-800">{formatDate(part.orderDate)}</strong></p>
                                <p>Solicitado Por: <strong className="text-slate-800">{part.soldBy || 'N/A'}</strong></p>
                            </div>

                            <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                                <div className="bg-amber-50/60 p-2 rounded-lg border border-amber-100">
                                    <span className="text-[10px] text-amber-800 font-bold uppercase block">Custo</span>
                                    <span className="font-bold text-amber-950 text-sm">R$ {costVal.toFixed(2)}</span>
                                </div>
                                <div className="bg-emerald-50/60 p-2 rounded-lg border border-emerald-100">
                                    <span className="text-[10px] text-emerald-800 font-bold uppercase block">Lucro Líquido</span>
                                    <span className={`font-bold text-sm ${netVal >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>R$ {netVal.toFixed(2)}</span>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 space-y-4">
                        <h3 className="font-bold text-slate-800">{editingPart ? 'Editar Peça Pedida' : 'Registrar Peça Pedida'}</h3>
                        <form onSubmit={handleSave} className="space-y-3 text-xs">
                            <div>
                                <label className="block font-bold uppercase mb-1">Descrição da Peça</label>
                                <input type="text" required value={partName} onChange={(e) => setPartName(e.target.value)} className="w-full p-2.5 border rounded-xl text-sm" />
                            </div>
                            <div>
                                <label className="block font-bold uppercase mb-1">Fornecedor</label>
                                <input type="text" required value={supplier} onChange={(e) => setSupplier(e.target.value)} className="w-full p-2.5 border rounded-xl text-sm" />
                            </div>
                            <div>
                                <label className="block font-bold uppercase mb-1">Data do Pedido</label>
                                <input type="date" required value={orderDate} onChange={(e) => setOrderDate(e.target.value)} className="w-full p-2.5 border rounded-xl text-sm" />
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                                <div>
                                    <label className="block font-bold uppercase mb-1">Custo (R$)</label>
                                    <input type="number" step="0.01" value={costPrice} onChange={(e) => setCostPrice(e.target.value)} className="w-full p-2 border rounded-xl text-sm" />
                                </div>
                                <div>
                                    <label className="block font-bold uppercase mb-1">Venda (R$)</label>
                                    <input type="number" step="0.01" value={sellPrice} onChange={(e) => setSellPrice(e.target.value)} className="w-full p-2 border rounded-xl text-sm" />
                                </div>
                                <div>
                                    <label className="block font-bold uppercase mb-1">Desconto</label>
                                    <input type="number" step="0.01" value={discount} onChange={(e) => setDiscount(e.target.value)} className="w-full p-2 border rounded-xl text-sm text-red-600" />
                                </div>
                            </div>
                            <div>
                                <label className="block font-bold uppercase mb-1">Colaborador Vendedor</label>
                                <select value={soldBy} onChange={(e) => setSoldBy(e.target.value)} className="w-full p-2.5 border rounded-xl bg-white text-sm">
                                    {approvedUsers.map(u => <option key={u.id} value={u.name}>{u.name}</option>)}
                                </select>
                            </div>
                            <div className="pt-3 flex justify-end space-x-2">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 bg-slate-100 rounded-xl font-bold">Cancelar</button>
                                <button type="submit" className="px-6 py-2 bg-blue-600 text-white rounded-xl font-bold shadow-md">Salvar</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

function WeeklyExtrasTab({
    weeklyExtras, setWeeklyExtras,
    weeklyExtrasConfig, setWeeklyExtrasConfig,
    weeklyExtrasHistory, setWeeklyExtrasHistory,
    customExtraLists, setCustomExtraLists,
    usersList, currentUser, saveDocCloud, deleteDocCloud
}) {
    const [subTab, setSubTab] = useState('weekly');
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
    const [isCreateListModalOpen, setIsCreateListModalOpen] = useState(false);
    const [isAddCustomItemModalOpen, setIsAddCustomItemModalOpen] = useState(false);
    const [selectedCustomListId, setSelectedCustomListId] = useState(null);

    const [description, setDescription] = useState('');
    const [amount, setAmount] = useState('');
    const [performedBy, setPerformedBy] = useState(currentUser.name);
    const [entryType, setEntryType] = useState('fixed');
    const [baseValue, setBaseValue] = useState('');
    const [percentage, setPercentage] = useState('');

    const [numEmployees, setNumEmployees] = useState(weeklyExtrasConfig.numEmployees || 3);
    const [payoutDay, setPayoutDay] = useState(weeklyExtrasConfig.payoutDay || 'Sábado');

    const [newListTitle, setNewListTitle] = useState('');
    const [newListNumEmployees, setNewListNumEmployees] = useState('3');
    const [newListDescription, setNewListDescription] = useState('');

    const [customItemDesc, setCustomItemDesc] = useState('');
    const [customItemAmount, setCustomItemAmount] = useState('');
    const [customItemUser, setCustomItemUser] = useState(currentUser.name);
    const [customEntryType, setCustomEntryType] = useState('fixed');
    const [customBaseValue, setCustomBaseValue] = useState('');
    const [customPercentage, setCustomPercentage] = useState('');

    const approvedUsers = usersList.filter(u => u.role === 'admin' || u.role === 'funcionario');

    const sharedExtras = weeklyExtras.filter(item => item.type !== 'percentage');
    const commissionExtras = weeklyExtras.filter(item => item.type === 'percentage');

    const totalSharedAmount = sharedExtras.reduce((acc, item) => acc + (parseFloat(item.amount) || 0), 0);
    const totalCommissionsAmount = commissionExtras.reduce((acc, item) => acc + (parseFloat(item.amount) || 0), 0);

    const configuredNumEmployees = Math.max(1, parseInt(weeklyExtrasConfig.numEmployees) || 1);
    const perEmployeeSharedAmount = totalSharedAmount / configuredNumEmployees;

    const handleAddExtra = (e) => {
        e.preventDefault();

        let finalAmount = parseFloat(amount) || 0;
        let finalDesc = description.trim();

        if (entryType === 'percentage') {
            const bVal = parseFloat(baseValue) || 0;
            const pVal = parseFloat(percentage) || 0;
            finalAmount = (bVal * pVal) / 100;
            finalDesc = `${description.trim()} (${pVal}% de R$ ${bVal.toFixed(2)})`;
        }

        if (finalAmount <= 0 || !description.trim()) return;

        const newItem = {
            id: Date.now().toString(),
            description: finalDesc,
            amount: finalAmount,
            performedBy: performedBy || currentUser.name,
            date: new Date().toISOString(),
            type: entryType
        };

        setWeeklyExtras(prev => [...prev, newItem]);
        saveDocCloud('weeklyExtras', newItem.id, newItem);
        setDescription('');
        setAmount('');
        setBaseValue('');
        setPercentage('');
        setIsAddModalOpen(false);
    };

    const handleDeleteExtra = (id) => {
        if (window.confirm('Remover este extra da lista principal?')) {
            setWeeklyExtras(prev => prev.filter(item => item.id !== id));
            deleteDocCloud('weeklyExtras', id);
        }
    };

    const handleSaveConfig = (e) => {
        e.preventDefault();
        const updated = { numEmployees: Math.max(1, parseInt(numEmployees) || 1), payoutDay };
        setWeeklyExtrasConfig(updated);
        saveDocCloud('settings', 'weeklyExtrasConfig', updated);
        setIsConfigModalOpen(false);
    };

    const handleCloseWeeklyPool = () => {
        if (weeklyExtras.length === 0) return alert('Não há extras ou comissões acumulados na lista semanal.');

        const confirmMsg = `Fechar e pagar a lista desta semana (${weeklyExtrasConfig.payoutDay})?\n\n` +
            `📦 Caixinha (A Dividir): R$ ${totalSharedAmount.toFixed(2)}\n` +
            `👨‍🔧 Divisão (${configuredNumEmployees} pess.): R$ ${perEmployeeSharedAmount.toFixed(2)} / cada\n\n` +
            `💰 Comissões (Não Divididas): R$ ${totalCommissionsAmount.toFixed(2)}\n\n` +
            `Esta lista será salva no histórico como PAGA e o acumulado voltará a zero.`;

        if (!window.confirm(confirmMsg)) return;

        const historyRecord = {
            id: Date.now().toString(),
            listType: 'main',
            listTitle: `Extras da Semana (${weeklyExtrasConfig.payoutDay})`,
            closedDate: new Date().toISOString(),
            closedBy: currentUser.name,
            status: 'pago',
            totalAmount: totalSharedAmount + totalCommissionsAmount,
            totalShared: totalSharedAmount,
            totalCommissions: totalCommissionsAmount,
            numEmployees: configuredNumEmployees,
            perEmployeeAmount: perEmployeeSharedAmount,
            items: [...weeklyExtras]
        };

        setWeeklyExtrasHistory(prev => [historyRecord, ...prev]);
        saveDocCloud('weeklyExtrasHistory', historyRecord.id, historyRecord);

        weeklyExtras.forEach(item => deleteDocCloud('weeklyExtras', item.id));
        setWeeklyExtras([]);
    };

    const handleCreateCustomList = (e) => {
        e.preventDefault();
        if (!newListTitle.trim()) return;
        const newList = {
            id: Date.now().toString(),
            title: newListTitle.trim(),
            numEmployees: Math.max(1, parseInt(newListNumEmployees) || 1),
            description: newListDescription.trim(),
            items: [],
            createdAt: new Date().toISOString(),
            createdBy: currentUser.name
        };

        setCustomExtraLists(prev => [...prev, newList]);
        saveDocCloud('customExtraLists', newList.id, newList);
        setNewListTitle('');
        setNewListNumEmployees('3');
        setNewListDescription('');
        setIsCreateListModalOpen(false);
    };

    const handleDeleteCustomList = (listId) => {
        if (window.confirm('Tem certeza que deseja excluir esta lista personalizada de extras?')) {
            setCustomExtraLists(prev => prev.filter(l => l.id !== listId));
            deleteDocCloud('customExtraLists', listId);
        }
    };

    const handleAddCustomItem = (e) => {
        e.preventDefault();

        let finalAmount = parseFloat(customItemAmount) || 0;
        let finalDesc = customItemDesc.trim();

        if (customEntryType === 'percentage') {
            const bVal = parseFloat(customBaseValue) || 0;
            const pVal = parseFloat(customPercentage) || 0;
            finalAmount = (bVal * pVal) / 100;
            finalDesc = `${customItemDesc.trim()} (${pVal}% de R$ ${bVal.toFixed(2)})`;
        }

        if (finalAmount <= 0 || !customItemDesc.trim() || !selectedCustomListId) return;

        const newItem = {
            id: Date.now().toString(),
            description: finalDesc,
            amount: finalAmount,
            performedBy: customItemUser || currentUser.name,
            date: new Date().toISOString(),
            type: customEntryType
        };

        setCustomExtraLists(prev => prev.map(list => {
            if (list.id === selectedCustomListId) {
                const updatedList = {
                    ...list,
                    items: [...(list.items || []), newItem]
                };
                saveDocCloud('customExtraLists', list.id, updatedList);
                return updatedList;
            }
            return list;
        }));

        setCustomItemDesc('');
        setCustomItemAmount('');
        setCustomBaseValue('');
        setCustomPercentage('');
        setIsAddCustomItemModalOpen(false);
    };

    const handleDeleteCustomItem = (listId, itemId) => {
        if (window.confirm('Remover este item da lista personalizada?')) {
            setCustomExtraLists(prev => prev.map(list => {
                if (list.id === listId) {
                    const updatedList = {
                        ...list,
                        items: (list.items || []).filter(i => i.id !== itemId)
                    };
                    saveDocCloud('customExtraLists', list.id, updatedList);
                    return updatedList;
                }
                return list;
            }));
        }
    };

    const handleCloseCustomList = (list) => {
        const listItems = list.items || [];
        const total = listItems.reduce((acc, item) => acc + (parseFloat(item.amount) || 0), 0);
        if (listItems.length === 0) return alert('Esta lista está vazia.');

        const numPeople = Math.max(1, parseInt(list.numEmployees) || 1);
        const perPerson = total / numPeople;

        if (!window.confirm(`Fechar e pagar a lista "${list.title}"?\n\nTotal: R$ ${total.toFixed(2)}\nDivisão (${numPeople} pess.): R$ ${perPerson.toFixed(2)} / cada\n\nO valor será registrado como PAGO no histórico e os itens da lista serão zerados.`)) return;

        const historyRecord = {
            id: Date.now().toString(),
            listType: 'custom',
            listTitle: list.title,
            closedDate: new Date().toISOString(),
            closedBy: currentUser.name,
            status: 'pago',
            totalAmount: total,
            numEmployees: numPeople,
            perEmployeeAmount: perPerson,
            items: [...listItems]
        };

        setWeeklyExtrasHistory(prev => [historyRecord, ...prev]);
        saveDocCloud('weeklyExtrasHistory', historyRecord.id, historyRecord);

        const updatedList = { ...list, items: [] };
        setCustomExtraLists(prev => prev.map(l => l.id === list.id ? updatedList : l));
        saveDocCloud('customExtraLists', list.id, updatedList);
    };

    return (
        <div className="space-y-6">
            <div className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white p-6 rounded-3xl shadow-lg flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="flex items-center space-x-3">
                    <Coins className="w-8 h-8 text-yellow-300" />
                    <div>
                        <h3 className="font-black text-xl">Extras & Comissões de Balcão</h3>
                        <p className="text-xs text-teal-100">Anotações de caixinha da equipe e comissões individuais.</p>
                    </div>
                </div>
                {currentUser.role === 'admin' && (
                    <div className="flex space-x-2">
                        <button onClick={() => setIsConfigModalOpen(true)} className="bg-white/10 hover:bg-white/20 px-3.5 py-2 rounded-xl text-xs font-bold flex items-center space-x-1.5 border border-white/20 transition-all">
                            <Settings className="w-4 h-4 text-yellow-300" />
                            <span>Configurar Sábado</span>
                        </button>
                        <button onClick={() => setIsCreateListModalOpen(true)} className="bg-yellow-400 hover:bg-yellow-500 text-slate-900 px-3.5 py-2 rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-md transition-all">
                            <ListPlus className="w-4 h-4" />
                            <span>+ Nova Lista Extra</span>
                        </button>
                    </div>
                )}
            </div>

            <div className="flex flex-wrap gap-2 bg-slate-200/80 p-1 rounded-xl w-fit text-xs font-bold">
                <button onClick={() => setSubTab('weekly')} className={`px-4 py-2 rounded-lg transition-all ${subTab === 'weekly' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}>
                    📅 Lista Principal ({weeklyExtrasConfig.payoutDay}) ({weeklyExtras.length})
                </button>
                <button onClick={() => setSubTab('custom')} className={`px-4 py-2 rounded-lg transition-all ${subTab === 'custom' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}>
                    📋 Outras Listas ({customExtraLists.length})
                </button>
                <button onClick={() => setSubTab('history')} className={`px-4 py-2 rounded-lg transition-all ${subTab === 'history' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}>
                    ✅ Histórico de Pagos ({weeklyExtrasHistory.length})
                </button>
            </div>

            {subTab === 'weekly' && (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-3 opacity-10"><Users className="w-16 h-16" /></div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase block relative z-10">Caixinha (A Dividir)</span>
                            <p className="text-2xl font-black text-slate-800 mt-1 relative z-10">R$ {totalSharedAmount.toFixed(2)}</p>
                        </div>
                        <div className="bg-emerald-50 p-5 rounded-2xl border border-emerald-100 shadow-sm">
                            <span className="text-[10px] font-bold text-emerald-600 uppercase block">Por Pessoa ({configuredNumEmployees} pess.)</span>
                            <p className="text-2xl font-black text-emerald-700 mt-1">R$ {perEmployeeSharedAmount.toFixed(2)}</p>
                        </div>
                        <div className="bg-blue-50 p-5 rounded-2xl border border-blue-100 shadow-sm relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-3 opacity-10"><User className="w-16 h-16" /></div>
                            <span className="text-[10px] font-bold text-blue-600 uppercase block relative z-10">Total Comissões (Não Divide)</span>
                            <p className="text-2xl font-black text-blue-700 mt-1 relative z-10">R$ {totalCommissionsAmount.toFixed(2)}</p>
                        </div>
                    </div>

                    <div className="flex justify-between items-center bg-slate-100 p-2 rounded-xl">
                        <h4 className="font-bold text-slate-800 text-sm px-2">Lançamentos da Semana</h4>
                        <div className="flex space-x-2">
                            <button onClick={handleCloseWeeklyPool} className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-sm flex items-center space-x-1.5 transition-all">
                                <CheckCircle2 className="w-4 h-4" />
                                <span className="hidden sm:inline">Pagar e Zerar Lista</span>
                            </button>
                            <button onClick={() => setIsAddModalOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-3 py-2 rounded-xl text-xs flex items-center space-x-1 shadow-md transition-all">
                                <Plus className="w-4 h-4" /> <span>Lançar Serviço/Comissão</span>
                            </button>
                        </div>
                    </div>

                    <div>
                        <h5 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 px-1 flex items-center space-x-2">
                            <Layers className="w-4 h-4 text-slate-400" />
                            <span>Caixinha Compartilhada (Divide por {configuredNumEmployees})</span>
                        </h5>
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden divide-y divide-slate-100">
                            {sharedExtras.length === 0 ? (
                                <p className="p-4 text-center text-slate-400 text-xs italic">Nenhum extra compartilhado lançado.</p>
                            ) : (
                                sharedExtras.map(item => (
                                    <div key={item.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                                        <div>
                                            <p className="font-bold text-slate-800 text-sm">{item.description}</p>
                                            <div className="flex items-center space-x-2 text-[11px] text-slate-400 mt-0.5">
                                                <span>Feito por: <strong className="text-slate-600">{item.performedBy}</strong></span>
                                                {item.date && <span>• {new Date(item.date).toLocaleDateString('pt-BR')}</span>}
                                            </div>
                                        </div>
                                        <div className="flex items-center space-x-3">
                                            <span className="font-black text-slate-700 text-base">R$ {parseFloat(item.amount).toFixed(2)}</span>
                                            <button onClick={() => handleDeleteExtra(item.id)} className="text-slate-300 hover:text-red-500 p-1"><Trash2 className="w-4 h-4" /></button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    <div>
                        <h5 className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-2 px-1 flex items-center space-x-2">
                            <Star className="w-4 h-4 text-blue-500" />
                            <span>Comissões Individuais (100% do Colaborador)</span>
                        </h5>
                        <div className="bg-blue-50/30 rounded-2xl shadow-sm border border-blue-100 overflow-hidden divide-y divide-blue-50">
                            {commissionExtras.length === 0 ? (
                                <p className="p-4 text-center text-blue-400 text-xs italic">Nenhuma comissão individual lançada.</p>
                            ) : (
                                commissionExtras.map(item => (
                                    <div key={item.id} className="p-4 flex items-center justify-between hover:bg-blue-50 transition-colors">
                                        <div>
                                            <p className="font-bold text-blue-900 text-sm">{item.description}</p>
                                            <div className="flex items-center space-x-2 text-[11px] text-blue-600/80 mt-0.5">
                                                <span>Recebedor: <strong className="text-blue-700">{item.performedBy}</strong></span>
                                                {item.date && <span>• {new Date(item.date).toLocaleDateString('pt-BR')}</span>}
                                            </div>
                                        </div>
                                        <div className="flex items-center space-x-3">
                                            <span className="font-black text-blue-700 text-base">R$ {parseFloat(item.amount).toFixed(2)}</span>
                                            <button onClick={() => handleDeleteExtra(item.id)} className="text-blue-300 hover:text-red-500 p-1"><Trash2 className="w-4 h-4" /></button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}

            {subTab === 'custom' && (
                <div className="space-y-6">
                    <div className="flex justify-between items-center">
                        <div>
                            <h4 className="font-bold text-slate-800 text-sm">Listas Personalizadas de Extras</h4>
                            <p className="text-xs text-slate-500">Listas adicionais para serviços ou comissões específicas de colaboradores.</p>
                        </div>
                        {currentUser.role === 'admin' && (
                            <button onClick={() => setIsCreateListModalOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center space-x-1 shadow-md transition-all">
                                <Plus className="w-4 h-4" /> <span>Nova Lista</span>
                            </button>
                        )}
                    </div>

                    {customExtraLists.length === 0 ? (
                        <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center space-y-3 shadow-sm">
                            <ListPlus className="w-12 h-12 text-slate-300 mx-auto" />
                            <h5 className="font-bold text-slate-700 text-sm">Nenhuma lista personalizada criada</h5>
                            <p className="text-xs text-slate-400 max-w-sm mx-auto">Você pode criar listas extras para projetos especiais, terceirizações de placa, comissões de películas e muito mais.</p>
                            {currentUser.role === 'admin' && (
                                <button onClick={() => setIsCreateListModalOpen(true)} className="px-4 py-2 bg-blue-50 text-blue-600 hover:bg-blue-100 font-bold rounded-xl text-xs border border-blue-200 transition-all">
                                    + Criar Primeira Lista
                                </button>
                            )}
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {customExtraLists.map(list => {
                                const items = list.items || [];
                                const total = items.reduce((acc, i) => acc + (parseFloat(i.amount) || 0), 0);
                                const numPess = Math.max(1, parseInt(list.numEmployees) || 1);
                                const perPess = total / numPess;

                                return (
                                    <div key={list.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex flex-col justify-between space-y-4 relative group">
                                        <div>
                                            <div className="flex justify-between items-start mb-2">
                                                <div className="pr-6">
                                                    <span className="text-[10px] font-bold uppercase text-indigo-600 bg-indigo-50 border border-indigo-100 px-2.5 py-0.5 rounded-full">
                                                        Divisão por {numPess} colaboradores
                                                    </span>
                                                    <h5 className="font-black text-slate-800 text-base mt-1.5">{list.title}</h5>
                                                    {list.description && <p className="text-xs text-slate-500 mt-0.5">{list.description}</p>}
                                                </div>

                                                {currentUser.role === 'admin' && (
                                                    <button onClick={() => handleDeleteCustomList(list.id)} className="text-slate-300 hover:text-red-500 p-1 opacity-80 hover:opacity-100" title="Excluir lista">
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </div>

                                            <div className="grid grid-cols-2 gap-2 my-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                                                <div>
                                                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Total da Lista</span>
                                                    <span className="font-black text-slate-800 text-lg">R$ {total.toFixed(2)}</span>
                                                </div>
                                                <div>
                                                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Por Pessoa ({numPess})</span>
                                                    <span className="font-black text-emerald-600 text-lg">R$ {perPess.toFixed(2)}</span>
                                                </div>
                                            </div>

                                            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                                                {items.length === 0 ? (
                                                    <p className="text-xs text-slate-400 italic py-2 text-center bg-slate-50/50 rounded-lg">Nenhum item lançado nesta lista.</p>
                                                ) : (
                                                    items.map(item => (
                                                        <div key={item.id} className="p-2 bg-slate-50/80 rounded-lg flex justify-between items-center text-xs">
                                                            <div className="min-w-0 pr-2">
                                                                <p className="font-bold text-slate-700 truncate">{item.description}</p>
                                                                <span className="text-[10px] text-slate-400">Por: {item.performedBy}</span>
                                                            </div>
                                                            <div className="flex items-center space-x-2 shrink-0">
                                                                <span className="font-bold text-emerald-700">R$ {parseFloat(item.amount).toFixed(2)}</span>
                                                                <button onClick={() => handleDeleteCustomItem(list.id, item.id)} className="text-slate-300 hover:text-red-500"><X className="w-3.5 h-3.5" /></button>
                                                            </div>
                                                        </div>
                                                    ))
                                                )}
                                            </div>
                                        </div>

                                        <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                                            <button
                                                onClick={() => {
                                                    setSelectedCustomListId(list.id);
                                                    setIsAddCustomItemModalOpen(true);
                                                }}
                                                className="flex-1 px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold rounded-xl text-xs flex items-center justify-center space-x-1 border border-blue-200 transition-all"
                                            >
                                                <Plus className="w-3.5 h-3.5" />
                                                <span>Anotar Extra</span>
                                            </button>

                                            <button
                                                onClick={() => handleCloseCustomList(list)}
                                                className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-sm flex items-center space-x-1 transition-all"
                                            >
                                                <CheckCircle2 className="w-3.5 h-3.5" />
                                                <span>Pagar e Zerar</span>
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {subTab === 'history' && (
                <div className="space-y-4">
                    <h4 className="font-bold text-slate-800 text-sm">Histórico de Listas Pagas e Fechadas</h4>

                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 divide-y divide-slate-100 overflow-hidden">
                        {weeklyExtrasHistory.length === 0 ? (
                            <div className="p-8 text-center text-slate-400 text-xs">
                                <Clock className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                                <p className="font-bold text-slate-600">Nenhum histórico de pagamento registrado.</p>
                                <p className="text-slate-400">Assim que uma lista for fechada e zerada, o comprovante aparecerá aqui.</p>
                            </div>
                        ) : (
                            weeklyExtrasHistory.map(hist => (
                                <div key={hist.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50 transition-colors">
                                    <div>
                                        <div className="flex items-center space-x-2">
                                            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 font-bold text-[10px] rounded-md border border-emerald-300 flex items-center space-x-1">
                                                <Check className="w-3 h-3" /> <span>PAGO</span>
                                            </span>
                                            <p className="font-bold text-slate-800 text-sm">{hist.listTitle || 'Extras da Semana'}</p>
                                        </div>
                                        <p className="text-xs text-slate-400 mt-1">
                                            Fechado em {new Date(hist.closedDate).toLocaleDateString('pt-BR')} por {hist.closedBy || 'Admin'}
                                        </p>
                                        <p className="text-[11px] text-slate-500 mt-0.5">
                                            Total: <strong className="text-slate-700">R$ {hist.totalAmount.toFixed(2)}</strong> ({hist.items?.length || 0} itens lançados)
                                        </p>
                                        {hist.totalShared !== undefined && (
                                            <p className="text-[10px] text-slate-400 mt-0.5">
                                                Caixinha: R$ {hist.totalShared.toFixed(2)} | Comissões: R$ {hist.totalCommissions.toFixed(2)}
                                            </p>
                                        )}
                                    </div>

                                    <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-xl text-right shrink-0">
                                        <span className="text-[10px] font-bold text-emerald-800 uppercase block">Divisão por {hist.numEmployees} pessoas</span>
                                        <span className="font-black text-emerald-700 text-base">R$ {hist.perEmployeeAmount.toFixed(2)} / cada</span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}

            {isAddModalOpen && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 space-y-4">
                        <div className="flex justify-between items-center border-b pb-3">
                            <h3 className="font-bold text-slate-800">Anotar Serviço / Comissão</h3>
                            <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
                        </div>
                        <form onSubmit={handleAddExtra} className="space-y-3 text-xs">
                            <div>
                                <label className="block font-bold uppercase mb-1">Descrição do Lançamento</label>
                                <input type="text" required value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Ex: Limpeza de vírus ou Venda de Película" className="w-full p-2.5 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500" />
                            </div>

                            <div className="flex space-x-2 bg-slate-50 p-1 rounded-xl border border-slate-200">
                                <button type="button" onClick={() => setEntryType('fixed')} className={`flex-1 py-1.5 rounded-lg font-bold transition-all flex flex-col items-center ${entryType === 'fixed' ? 'bg-blue-600 text-white shadow' : 'text-slate-600 hover:bg-slate-200'}`}>
                                    <span>Valor Fixo (Caixinha)</span>
                                    <span className="text-[9px] font-normal opacity-80 mt-0.5">Divide com a equipe</span>
                                </button>
                                <button type="button" onClick={() => setEntryType('percentage')} className={`flex-1 py-1.5 rounded-lg font-bold transition-all flex flex-col items-center ${entryType === 'percentage' ? 'bg-blue-600 text-white shadow' : 'text-slate-600 hover:bg-slate-200'}`}>
                                    <span>Comissão (%)</span>
                                    <span className="text-[9px] font-normal opacity-80 mt-0.5">100% do funcionário</span>
                                </button>
                            </div>

                            {entryType === 'fixed' ? (
                                <div>
                                    <label className="block font-bold uppercase mb-1">Valor do Serviço (R$)</label>
                                    <input type="number" step="0.01" required={entryType === 'fixed'} value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="30.00" className="w-full p-2.5 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500" />
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="block font-bold uppercase mb-1">Base (R$)</label>
                                        <input type="number" step="0.01" required={entryType === 'percentage'} value={baseValue} onChange={(e) => setBaseValue(e.target.value)} placeholder="Ex: 100" className="w-full p-2.5 border rounded-xl" />
                                    </div>
                                    <div>
                                        <label className="block font-bold uppercase mb-1">Porcentagem (%)</label>
                                        <input type="number" step="0.01" required={entryType === 'percentage'} value={percentage} onChange={(e) => setPercentage(e.target.value)} placeholder="Ex: 10" className="w-full p-2.5 border rounded-xl" />
                                    </div>
                                </div>
                            )}

                            <div>
                                <label className="block font-bold uppercase mb-1">Realizado Por</label>
                                <select value={performedBy} onChange={(e) => setPerformedBy(e.target.value)} className="w-full p-2.5 border rounded-xl bg-white outline-none focus:ring-2 focus:ring-blue-500">
                                    {approvedUsers.map(u => <option key={u.id} value={u.name}>{u.name}</option>)}
                                </select>
                            </div>

                            <div className="pt-3 flex justify-end space-x-2 border-t">
                                <button type="button" onClick={() => setIsAddModalOpen(false)} className="px-4 py-2 bg-slate-100 rounded-xl font-bold">Cancelar</button>
                                <button type="submit" className="px-6 py-2 bg-blue-600 text-white rounded-xl font-bold shadow-md">Salvar Anotação</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

{/* MODAL: CONFIG MAIN LIST */ }
{
    isConfigModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 space-y-4">
                <div className="flex justify-between items-center border-b pb-3">
                    <h3 className="font-bold text-slate-800">Configurar Divisão dos Extras da Semana</h3>
                    <button onClick={() => setIsConfigModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
                </div>
                <form onSubmit={handleSaveConfig} className="space-y-3 text-xs">
                    <div>
                        <label className="block font-bold uppercase mb-1">Quantidade de Colaboradores para Dividir</label>
                        <input type="number" min="1" required value={numEmployees} onChange={(e) => setNumEmployees(e.target.value)} className="w-full p-2.5 border rounded-xl" />
                        <p className="text-[11px] text-slate-400 mt-1">O valor acumulado na CAIXINHA será dividido igualmente por este número (as comissões não se dividem).</p>
                    </div>
                    <div>
                        <label className="block font-bold uppercase mb-1">Dia do Fechamento / Pagamento</label>
                        <select value={payoutDay} onChange={(e) => setPayoutDay(e.target.value)} className="w-full p-2.5 border rounded-xl bg-white font-medium">
                            {['Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado', 'Domingo'].map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                    </div>
                    <div className="pt-3 flex justify-end space-x-2">
                        <button type="button" onClick={() => setIsConfigModalOpen(false)} className="px-4 py-2 bg-slate-100 rounded-xl font-bold">Cancelar</button>
                        <button type="submit" className="px-6 py-2 bg-blue-600 text-white rounded-xl font-bold shadow-md">Salvar Alterações</button>
                    </div>
                </form>
            </div>
        </div>
    )
}

{/* MODAL: CREATE CUSTOM EXTRA LIST */ }
{
    isCreateListModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 space-y-4">
                <div className="flex justify-between items-center border-b pb-3">
                    <h3 className="font-bold text-slate-800">Criar Nova Lista de Extras</h3>
                    <button onClick={() => setIsCreateListModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
                </div>
                <form onSubmit={handleCreateCustomList} className="space-y-3 text-xs">
                    <div>
                        <label className="block font-bold uppercase mb-1">Nome da Lista</label>
                        <input type="text" required value={newListTitle} onChange={(e) => setNewListTitle(e.target.value)} placeholder="Ex: Serviços de Solda, Comissão de Películas..." className="w-full p-2.5 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div>
                        <label className="block font-bold uppercase mb-1">Quantidade de Colaboradores para Divisão</label>
                        <input type="number" min="1" required value={newListNumEmployees} onChange={(e) => setNewListNumEmployees(e.target.value)} className="w-full p-2.5 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div>
                        <label className="block font-bold uppercase mb-1">Descrição / Observações (Opcional)</label>
                        <input type="text" value={newListDescription} onChange={(e) => setNewListDescription(e.target.value)} placeholder="Ex: Serviços terceirizados ou projetos especiais" className="w-full p-2.5 border rounded-xl" />
                    </div>
                    <div className="pt-3 flex justify-end space-x-2">
                        <button type="button" onClick={() => setIsCreateListModalOpen(false)} className="px-4 py-2 bg-slate-100 rounded-xl font-bold text-slate-700">Cancelar</button>
                        <button type="submit" className="px-6 py-2 bg-blue-600 text-white rounded-xl font-bold shadow-md hover:bg-blue-700 transition-all">Criar Lista</button>
                    </div>
                </form>
            </div>
        </div>
    )
}

{/* MODAL: ADD ITEM TO CUSTOM LIST */ }
{
    isAddCustomItemModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 space-y-4">
                <div className="flex justify-between items-center border-b pb-3">
                    <h3 className="font-bold text-slate-800">Anotar Extra na Lista Personalizada</h3>
                    <button onClick={() => setIsAddCustomItemModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
                </div>
                <form onSubmit={handleAddCustomItem} className="space-y-3 text-xs">
                    <div>
                        <label className="block font-bold uppercase mb-1">Descrição do Serviço</label>
                        <input type="text" required value={customItemDesc} onChange={(e) => setCustomItemDesc(e.target.value)} placeholder="Ex: Reballing CI de Carga" className="w-full p-2.5 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>

                    <div className="flex space-x-2 bg-slate-50 p-1 rounded-xl border border-slate-200">
                        <button type="button" onClick={() => setCustomEntryType('fixed')} className={`flex-1 py-1.5 rounded-lg font-bold transition-all ${customEntryType === 'fixed' ? 'bg-blue-600 text-white shadow' : 'text-slate-600 hover:bg-slate-200'}`}>Valor Fixo</button>
                        <button type="button" onClick={() => setCustomEntryType('percentage')} className={`flex-1 py-1.5 rounded-lg font-bold transition-all ${customEntryType === 'percentage' ? 'bg-blue-600 text-white shadow' : 'text-slate-600 hover:bg-slate-200'}`}>Comissão (%)</button>
                    </div>

                    {customEntryType === 'fixed' ? (
                        <div>
                            <label className="block font-bold uppercase mb-1">Valor (R$)</label>
                            <input type="number" step="0.01" required={customEntryType === 'fixed'} value={customItemAmount} onChange={(e) => setCustomItemAmount(e.target.value)} placeholder="50.00" className="w-full p-2.5 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500" />
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block font-bold uppercase mb-1">Valor Base (R$)</label>
                                <input type="number" step="0.01" required={customEntryType === 'percentage'} value={customBaseValue} onChange={(e) => setCustomBaseValue(e.target.value)} placeholder="Ex: 250.00" className="w-full p-2.5 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500" />
                            </div>
                            <div>
                                <label className="block font-bold uppercase mb-1">Porcentagem (%)</label>
                                <input type="number" step="0.01" required={customEntryType === 'percentage'} value={customPercentage} onChange={(e) => setCustomPercentage(e.target.value)} placeholder="Ex: 20" className="w-full p-2.5 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500" />
                            </div>
                        </div>
                    )}

                    <div>
                        <label className="block font-bold uppercase mb-1">Colaborador Que Realizou</label>
                        <select value={customItemUser} onChange={(e) => setCustomItemUser(e.target.value)} className="w-full p-2.5 border rounded-xl bg-white font-medium">
                            {approvedUsers.map(u => <option key={u.id} value={u.name}>{u.name}</option>)}
                        </select>
                    </div>
                    <div className="pt-3 flex justify-end space-x-2">
                        <button type="button" onClick={() => setIsAddCustomItemModalOpen(false)} className="px-4 py-2 bg-slate-100 rounded-xl font-bold text-slate-700">Cancelar</button>
                        <button type="submit" className="px-6 py-2 bg-blue-600 text-white rounded-xl font-bold shadow-md hover:bg-blue-700 transition-all">Anotar Item</button>
                    </div>
                </form>
            </div>
        </div>
    )
}
        </div >
    );
}

function ShoppingTab({ shoppingList, setShoppingList, inventory, setInventory, currentUser, saveDocCloud, deleteDocCloud }) {
    const [newItemName, setNewItemName] = useState('');

    const addItem = (e) => {
        e.preventDefault();
        if (!newItemName.trim()) return;
        const item = {
            id: Date.now().toString(),
            name: newItemName.trim(),
            quantity: 1,
            addedBy: currentUser.name,
            checked: false
        };
        setShoppingList(prev => [...prev, item]);
        saveDocCloud('shoppingList', item.id, item);
        setNewItemName('');
    };

    const toggleCheck = (id) => {
        setShoppingList(prev => prev.map(item => {
            if (item.id === id) {
                const updated = { ...item, checked: !item.checked };
                saveDocCloud('shoppingList', item.id, updated);
                return updated;
            }
            return item;
        }));
    };

    const removeItem = (id) => {
        setShoppingList(prev => prev.filter(i => i.id !== id));
        deleteDocCloud('shoppingList', id);
    };

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            <form onSubmit={addItem} className="flex space-x-2">
                <input
                    type="text"
                    required
                    placeholder="Adicionar item à lista de compras..."
                    value={newItemName}
                    onChange={(e) => setNewItemName(e.target.value)}
                    className="flex-1 px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                />
                <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-5 py-3 rounded-xl shadow-md text-sm">Adicionar</button>
            </form>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden divide-y divide-slate-100">
                {shoppingList.length === 0 ? (
                    <p className="p-8 text-center text-slate-400 text-xs">A lista de compras está vazia.</p>
                ) : (
                    shoppingList.map(item => (
                        <div key={item.id} className="p-4 flex items-center justify-between hover:bg-slate-50">
                            <div className="flex items-center space-x-3">
                                <button onClick={() => toggleCheck(item.id)} className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${item.checked ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-300'}`}>
                                    {item.checked && <Check className="w-3.5 h-3.5" />}
                                </button>
                                <div>
                                    <span className={`text-sm font-bold ${item.checked ? 'line-through text-slate-400' : 'text-slate-800'}`}>{item.name}</span>
                                    {item.addedBy && <span className="text-[10px] text-slate-400 block">Adicionado por: {item.addedBy}</span>}
                                </div>
                            </div>
                            <button onClick={() => removeItem(item.id)} className="text-slate-300 hover:text-red-500 p-1"><Trash2 className="w-4 h-4" /></button>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}

function PasswordsTab({ storePasswords, setStorePasswords, orders, currentUser, saveDocCloud, deleteDocCloud }) {
    const [title, setTitle] = useState('');
    const [password, setPassword] = useState('');

    const handleAdd = (e) => {
        e.preventDefault();
        const item = {
            id: Date.now().toString(),
            title,
            password,
            createdBy: currentUser.name,
            createdAt: new Date().toISOString()
        };
        setStorePasswords(prev => [...prev, item]);
        saveDocCloud('storePasswords', item.id, item);
        setTitle('');
        setPassword('');
    };

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
                <h3 className="font-bold text-slate-800 text-sm">Salvar Senha do Sistema ou Loja</h3>
                <form onSubmit={handleAdd} className="grid grid-cols-2 gap-2 text-xs">
                    <input type="text" required placeholder="Título / Serviço (Ex: Wi-Fi Balcão)" value={title} onChange={(e) => setTitle(e.target.value)} className="p-2.5 border rounded-xl" />
                    <input type="text" required placeholder="Senha" value={password} onChange={(e) => setPassword(e.target.value)} className="p-2.5 border rounded-xl" />
                    <button type="submit" className="col-span-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-xl text-xs shadow-md">Salvar Senha</button>
                </form>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 divide-y divide-slate-100">
                {storePasswords.length === 0 ? (
                    <p className="p-8 text-center text-slate-400 text-xs">Nenhuma senha registrada.</p>
                ) : (
                    storePasswords.map(p => (
                        <div key={p.id} className="p-4 flex justify-between items-center text-xs">
                            <div>
                                <p className="font-bold text-slate-800 text-sm">{p.title}</p>
                                <p className="font-mono text-blue-600 font-bold mt-0.5 text-sm">{p.password}</p>
                            </div>
                            <button onClick={() => { setStorePasswords(prev => prev.filter(item => item.id !== p.id)); deleteDocCloud('storePasswords', p.id); }} className="text-slate-300 hover:text-red-500 p-1"><Trash2 className="w-4 h-4" /></button>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}

function CollaboratorsTab({ usersList, orders, orderedParts, pointRules, setPointRules, currentUser, saveDocCloud }) {
    const activeTechs = usersList.filter(u => u.role !== 'pendente');

    return (
        <div className="space-y-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-2">
                <h3 className="text-base font-bold text-slate-800 flex items-center space-x-2">
                    <Trophy className="w-5 h-5 text-amber-500" />
                    <span>Ranking e Pontuação da Equipe</span>
                </h3>
                <p className="text-xs text-slate-500">Cada OS concluída e cada peça pedida pontuam o colaborador no ranking interno.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {activeTechs.map(tech => {
                    const techOrders = orders.filter(o => (o.assignedTech === tech.name || o.techBy === tech.name) && (o.status === 'concluido' || o.status === 'Pronto' || o.status === 'retirado' || o.status === 'Entregue'));
                    const points = techOrders.length * (pointRules.basePointsOS || 10);

                    return (
                        <div key={tech.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center space-x-4">
                            <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-600 font-bold flex items-center justify-center text-lg shrink-0 border border-blue-200">
                                {tech.avatarUrl ? <img src={tech.avatarUrl} alt={tech.name} className="w-full h-full object-cover rounded-2xl" /> : tech.name.charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1">
                                <h4 className="font-bold text-slate-800 text-base">{tech.name}</h4>
                                <p className="text-xs text-slate-400">{techOrders.length} Ordens Concluídas</p>
                            </div>
                            <div className="text-right">
                                <span className="font-black text-blue-600 text-xl">{points} pts</span>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

function SummaryTab({ orders, orderedParts, inventory, closedReports, setClosedReports, currentUser, saveDocCloud, deleteDocCloud }) {
    const deliveredOrders = orders.filter(o => o.status === 'retirado' || o.status === 'Entregue' || o.status === 'concluido' || o.status === 'Pronto');
    const totalRevenue = deliveredOrders.reduce((acc, o) => {
        const valPrice = parseFloat(o.price || o.salePrice || 0);
        const valDiscount = parseFloat(o.discount || 0);
        return acc + Math.max(0, valPrice - valDiscount);
    }, 0);
    const totalCost = deliveredOrders.reduce((acc, o) => acc + (parseFloat(o.costPrice || 0)), 0);
    const grossProfit = totalRevenue - totalCost;

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                    <span className="text-xs font-bold text-slate-400 uppercase">Faturamento Bruto</span>
                    <p className="text-2xl font-black text-slate-800 mt-1">R$ {totalRevenue.toFixed(2)}</p>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                    <span className="text-xs font-bold text-slate-400 uppercase">Custo de Peças</span>
                    <p className="text-2xl font-black text-red-500 mt-1">R$ {totalCost.toFixed(2)}</p>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                    <span className="text-xs font-bold text-slate-400 uppercase">Lucro Líquido Estimado</span>
                    <p className="text-2xl font-black text-emerald-600 mt-1">R$ {grossProfit.toFixed(2)}</p>
                </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3">
                <h3 className="font-bold text-slate-800 text-sm">Estatísticas Gerais</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                        <span className="text-slate-400 block mb-0.5">Total OS Cadastradas</span>
                        <span className="font-bold text-slate-800 text-lg">{orders.length}</span>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                        <span className="text-slate-400 block mb-0.5">Peças em Estoque</span>
                        <span className="font-bold text-slate-800 text-lg">{inventory.reduce((a, b) => a + (parseInt(b.quantity) || 0), 0)}</span>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                        <span className="text-slate-400 block mb-0.5">Peças Pedidas</span>
                        <span className="font-bold text-slate-800 text-lg">{orderedParts.length}</span>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                        <span className="text-slate-400 block mb-0.5">Entregues / Concluídas</span>
                        <span className="font-bold text-emerald-600 text-lg">{deliveredOrders.length}</span>
                    </div>
                </div>
            </div>
        </div>
    );
}

function AppsTab({ utilityApps, setUtilityApps, currentUser, saveDocCloud, deleteDocCloud }) {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingApp, setEditingApp] = useState(null);

    const [name, setName] = useState('');
    const [url, setUrl] = useState('');
    const [icon, setIcon] = useState('🔗');
    const [description, setDescription] = useState('');

    const openModal = (app = null) => {
        setEditingApp(app);
        setName(app ? app.name : '');
        setUrl(app ? app.url : '');
        setIcon(app ? app.icon : '🔗');
        setDescription(app ? app.description : '');
        setIsModalOpen(true);
    };

    const handleSave = (e) => {
        e.preventDefault();
        const newApp = {
            id: editingApp ? editingApp.id : Date.now().toString(),
            name,
            url,
            icon,
            description,
            category: 'Geral'
        };

        if (editingApp) {
            setUtilityApps(prev => prev.map(a => a.id === newApp.id ? newApp : a));
        } else {
            setUtilityApps(prev => [...prev, newApp]);
        }
        saveDocCloud('utilityApps', newApp.id, newApp);
        setIsModalOpen(false);
    };

    const deleteApp = (id) => {
        if (window.confirm('Excluir este app/link da lista?')) {
            setUtilityApps(prev => prev.filter(a => a.id !== id));
            deleteDocCloud('utilityApps', id);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
                <div>
                    <h3 className="font-bold text-slate-800 text-sm">Links Úteis & Ferramentas</h3>
                    <p className="text-xs text-slate-500">Acesso rápido a sites de fornecedores, consultas e sistemas.</p>
                </div>
                <button onClick={() => openModal()} className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2 rounded-xl text-xs shadow-md flex items-center space-x-1">
                    <Plus className="w-4 h-4" /> <span>Novo Link</span>
                </button>
            </div>

            {utilityApps.length === 0 ? (
                <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center text-slate-400">
                    <AppWindow className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                    <p className="font-bold text-slate-600">Nenhum link cadastrado.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {utilityApps.map(app => (
                        <div key={app.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:border-blue-400 transition-all group relative">
                            <div className="absolute top-3 right-3 flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => openModal(app)} className="p-1.5 bg-slate-50 hover:bg-blue-50 text-blue-600 rounded-lg"><Edit2 className="w-3.5 h-3.5" /></button>
                                <button onClick={() => deleteApp(app.id)} className="p-1.5 bg-slate-50 hover:bg-red-50 text-red-600 rounded-lg"><Trash2 className="w-3.5 h-3.5" /></button>
                            </div>
                            <a href={app.url} target="_blank" rel="noreferrer" className="block mt-2">
                                <span className="text-3xl mb-3 block">{app.icon}</span>
                                <h4 className="font-bold text-slate-800 group-hover:text-blue-600 text-sm">{app.name}</h4>
                                <p className="text-xs text-slate-500 mt-1">{app.description}</p>
                            </a>
                        </div>
                    ))}
                </div>
            )}

            {isModalOpen && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 space-y-4">
                        <div className="flex justify-between items-center border-b pb-3">
                            <h3 className="font-bold text-slate-800">{editingApp ? 'Editar Link' : 'Novo Link Útil'}</h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
                        </div>
                        <form onSubmit={handleSave} className="space-y-3 text-xs">
                            <div>
                                <label className="block font-bold uppercase mb-1">Nome / Título</label>
                                <input type="text" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: WhatsApp Web" className="w-full p-2.5 border rounded-xl" />
                            </div>
                            <div>
                                <label className="block font-bold uppercase mb-1">Link (URL)</label>
                                <input type="url" required value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://..." className="w-full p-2.5 border rounded-xl" />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="col-span-1">
                                    <label className="block font-bold uppercase mb-1">Ícone (Emoji)</label>
                                    <input type="text" required value={icon} onChange={(e) => setIcon(e.target.value)} placeholder="💬" className="w-full p-2.5 border rounded-xl text-center text-lg" />
                                </div>
                                <div className="col-span-2">
                                    <label className="block font-bold uppercase mb-1">Descrição Breve</label>
                                    <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Ex: Atendimento ao cliente" className="w-full p-2.5 border rounded-xl" />
                                </div>
                            </div>
                            <div className="pt-3 flex justify-end space-x-2">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 bg-slate-100 rounded-xl font-bold text-slate-700">Cancelar</button>
                                <button type="submit" className="px-6 py-2 bg-blue-600 text-white rounded-xl font-bold shadow-md">Salvar</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

function SettingsTab({ currentUser, onUpdateUser, appSettings, setAppSettings, setShowFirebaseModal, isCloudConnected }) {
    const [userName, setUserName] = useState(currentUser.name || '');
    const [userEmail, setUserEmail] = useState(currentUser.email || '');
    const [userPassword, setUserPassword] = useState(currentUser.password || '');
    const [avatarUrl, setAvatarUrl] = useState(currentUser.avatarUrl || '');

    const handleAvatarUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const MAX_WIDTH = 300; const MAX_HEIGHT = 300;
                let width = img.width; let height = img.height;
                if (width > height) { if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; } }
                else { if (height > MAX_HEIGHT) { width *= MAX_HEIGHT / height; height = MAX_HEIGHT; } }
                canvas.width = width; canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                setAvatarUrl(canvas.toDataURL('image/jpeg', 0.8));
            };
            img.src = event.target.result;
        };
        reader.readAsDataURL(file);
    };

    const handleSaveProfile = (e) => {
        e.preventDefault();
        if (!userName.trim() || !userEmail.trim()) {
            alert('Preencha seu nome e e-mail.');
            return;
        }
        const updated = {
            ...currentUser,
            name: userName.trim(),
            email: userEmail.trim().toLowerCase(),
            password: userPassword.trim(),
            avatarUrl
        };
        onUpdateUser(updated);
        alert('Seu perfil e senha foram atualizados com sucesso!');
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center space-x-2">
                    <User className="w-5 h-5 text-blue-600" />
                    <span>Meu Perfil de Usuário</span>
                </h3>

                <form onSubmit={handleSaveProfile} className="space-y-4">
                    <div className="flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-6 pb-4 border-b border-slate-100">
                        <div className="relative w-24 h-24 rounded-2xl bg-blue-100 text-blue-700 font-bold flex items-center justify-center border-2 border-blue-200 overflow-hidden shadow-inner shrink-0 text-3xl">
                            {avatarUrl ? (
                                <img src={avatarUrl} alt={userName} className="w-full h-full object-cover" />
                            ) : (
                                userName.charAt(0).toUpperCase()
                            )}
                        </div>

                        <div className="space-y-2 text-center sm:text-left flex-1">
                            <label className="block text-xs font-bold text-slate-700 uppercase">Alterar Foto de Perfil</label>
                            <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
                                <input
                                    type="url"
                                    value={avatarUrl}
                                    onChange={(e) => setAvatarUrl(e.target.value)}
                                    placeholder="Cole o link de uma imagem (http...)"
                                    className="px-3 py-2 border rounded-xl text-xs flex-1 outline-none focus:ring-2 focus:ring-blue-500"
                                />
                                <label className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs cursor-pointer border flex items-center justify-center shrink-0">
                                    <span>Anexar Foto</span>
                                    <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
                                </label>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Seu Nome</label>
                            <input
                                type="text"
                                required
                                value={userName}
                                onChange={(e) => setUserName(e.target.value)}
                                className="w-full px-4 py-2.5 border rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Seu E-mail</label>
                            <input
                                type="email"
                                required
                                value={userEmail}
                                onChange={(e) => setUserEmail(e.target.value)}
                                className="w-full px-4 py-2.5 border rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        <div className="sm:col-span-2">
                            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Senha de Acesso ao App</label>
                            <input
                                type="password"
                                required
                                value={userPassword}
                                onChange={(e) => setUserPassword(e.target.value)}
                                placeholder="Sua senha secreta de acesso"
                                className="w-full px-4 py-2.5 border rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                    </div>

                    <div className="flex justify-end pt-2">
                        <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-2.5 rounded-xl shadow-md text-xs">
                            Salvar Perfil
                        </button>
                    </div>
                </form>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
                <h3 className="text-lg font-bold text-slate-800 flex items-center space-x-2">
                    <Sliders className="w-5 h-5 text-indigo-600" />
                    <span>Sons & Notificações do Aplicativo</span>
                </h3>

                <div className="space-y-4">
                    <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                        <div className="flex items-center space-x-3">
                            {appSettings.soundEnabled ? <Volume2 className="w-5 h-5 text-emerald-600" /> : <VolumeX className="w-5 h-5 text-slate-400" />}
                            <div>
                                <p className="font-bold text-slate-800 text-sm">Sons e Efeitos Sonoros</p>
                                <p className="text-xs text-slate-500">Tocar um som sutil ao concluir ações ou salvar OS.</p>
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={() => {
                                const updated = { ...appSettings, soundEnabled: !appSettings.soundEnabled };
                                setAppSettings(updated);
                                playAppSound('success', updated.soundEnabled, updated.soundVolume);
                            }}
                            className={`w-12 h-6 rounded-full p-1 transition-colors ${appSettings.soundEnabled ? 'bg-emerald-500' : 'bg-slate-300'}`}
                        >
                            <div className={`w-4 h-4 rounded-full bg-white transition-transform ${appSettings.soundEnabled ? 'translate-x-6' : 'translate-x-0'}`}></div>
                        </button>
                    </div>

                    <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                        <div className="flex items-center space-x-3">
                            <Bell className="w-5 h-5 text-blue-600" />
                            <div>
                                <p className="font-bold text-slate-800 text-sm">Central de Alertas e Notificações (Geral)</p>
                                <p className="text-xs text-slate-500">Ativar ou desativar todas as notificações do app.</p>
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={() => setAppSettings({ ...appSettings, notificationsEnabled: !appSettings.notificationsEnabled })}
                            className={`w-12 h-6 rounded-full p-1 transition-colors ${appSettings.notificationsEnabled ? 'bg-blue-600' : 'bg-slate-300'}`}
                        >
                            <div className={`w-4 h-4 rounded-full bg-white transition-transform ${appSettings.notificationsEnabled ? 'translate-x-6' : 'translate-x-0'}`}></div>
                        </button>
                    </div>

                    {appSettings.notificationsEnabled && (
                        <div className="pt-3 border-t border-slate-100 space-y-3">
                            <p className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Escolha quais notificações deseja receber:</p>

                            {[
                                { key: 'notifyOsEntry', title: 'Entrada de OS (Pendente)', desc: 'Notificar sobre novas Ordens de Serviço aguardando atendimento', icon: Wrench, color: 'text-blue-600' },
                                { key: 'notifyOsRetirado', title: 'Aparelho Retirado / Entregue', desc: 'Notificar sobre aparelhos que foram entregues aos clientes', icon: CheckCircle2, color: 'text-emerald-600' },
                                { key: 'notifyNewInventory', title: 'Novo Produto em Estoque', desc: 'Notificar quando novos itens forem cadastrados no estoque', icon: Package, color: 'text-indigo-600' },
                                { key: 'notifyLowStock', title: 'Produto em Estoque Baixo', desc: 'Avisar quando a quantidade atingir ou ficar abaixo do mínimo', icon: AlertTriangle, color: 'text-amber-600' },
                                { key: 'notifyDelayPickup', title: 'Aparelho Pronto há +3 dias (Sem Retirada)', desc: 'Alerta para aparelhos prontos aguardando o cliente buscar', icon: Calendar, color: 'text-purple-600' },
                                { key: 'notifyDelayWork', title: 'OS em Andamento há +3 dias', desc: 'Aviso de serviços em bancada demorados', icon: Wrench, color: 'text-orange-600' },
                                { key: 'notifyWarrantyExpire', title: 'Garantia Expirando (90 dias)', desc: 'Alerta de prazo legal de garantia dos serviços prestados', icon: ShieldCheck, color: 'text-red-600' },
                            ].map((item) => (
                                <div key={item.key} className="flex items-center justify-between p-3 bg-slate-50/70 hover:bg-slate-50 rounded-xl border border-slate-200/80 transition-colors">
                                    <div className="flex items-center space-x-3">
                                        <item.icon className={`w-4 h-4 ${item.color}`} />
                                        <div>
                                            <p className="font-bold text-slate-800 text-xs">{item.title}</p>
                                            <p className="text-[11px] text-slate-500">{item.desc}</p>
                                        </div>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={() => setAppSettings({ ...appSettings, [item.key]: !appSettings[item.key] })}
                                        className={`w-10 h-5 rounded-full p-0.5 transition-colors ${appSettings[item.key] !== false ? 'bg-blue-600' : 'bg-slate-300'}`}
                                    >
                                        <div className={`w-4 h-4 rounded-full bg-white transition-transform ${appSettings[item.key] !== false ? 'translate-x-5' : 'translate-x-0'}`}></div>
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                    <Cloud className={`w-8 h-8 ${isCloudConnected ? 'text-emerald-500' : 'text-slate-400'}`} />
                    <div>
                        <h4 className="font-bold text-slate-800 text-sm">Banco de Dados em Nuvem (Firebase)</h4>
                        <p className="text-xs text-slate-500">{isCloudConnected ? 'Ativo e sincronizando dados em tempo real.' : 'Inativo. Os dados estão salvos apenas neste aparelho.'}</p>
                    </div>
                </div>

                <button
                    onClick={() => setShowFirebaseModal(true)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs border"
                >
                    {isCloudConnected ? 'Gerenciar Nuvem' : 'Conectar Nuvem'}
                </button>
            </div>
        </div>
    );
}

function TeamTab({ usersList, setUsersList, currentUser, saveDocCloud, deleteDocCloud }) {
    const handleRoleChange = (userId, newRole) => {
        setUsersList(prev => prev.map(u => {
            if (u.id === userId) {
                const updated = { ...u, role: newRole };
                saveDocCloud('users', u.id, updated);
                return updated;
            }
            return u;
        }));
    };

    const handleDeleteUser = (userId) => {
        if (window.confirm('Excluir este usuário do sistema?')) {
            setUsersList(prev => prev.filter(u => u.id !== userId));
            deleteDocCloud('users', userId);
        }
    };

    const pendingUsers = usersList.filter(u => u.role === 'pendente');
    const activeUsers = usersList.filter(u => u.role !== 'pendente');

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            {pendingUsers.length > 0 && (
                <div className="bg-amber-50 p-6 rounded-3xl border border-amber-200 shadow-sm space-y-4">
                    <div className="flex items-center space-x-2 text-amber-900">
                        <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                        <h3 className="font-bold text-base">Contas Aguardando Aprovação ({pendingUsers.length})</h3>
                    </div>

                    <div className="divide-y divide-amber-200/60">
                        {pendingUsers.map(u => (
                            <div key={u.id} className="py-3 flex items-center justify-between">
                                <div>
                                    <h4 className="font-bold text-amber-950 text-sm">{u.name}</h4>
                                    <p className="text-xs text-amber-800">{u.email}</p>
                                </div>

                                <div className="flex items-center space-x-2">
                                    <button
                                        onClick={() => handleRoleChange(u.id, 'funcionario')}
                                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-sm flex items-center space-x-1"
                                    >
                                        <Check className="w-3.5 h-3.5" />
                                        <span>Aprovar Colaborador</span>
                                    </button>

                                    <button
                                        onClick={() => handleRoleChange(u.id, 'admin')}
                                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs shadow-sm flex items-center space-x-1"
                                    >
                                        <Shield className="w-3.5 h-3.5" />
                                        <span>Aprovar Admin</span>
                                    </button>

                                    <button onClick={() => handleDeleteUser(u.id)} className="p-1.5 text-amber-800 hover:text-red-600 rounded-lg">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
                <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center space-x-2">
                    <Users className="w-5 h-5 text-indigo-600" />
                    <span>Usuários Ativos & Permissões</span>
                </h3>

                <div className="divide-y divide-slate-100">
                    {activeUsers.map(u => (
                        <div key={u.id} className="py-4 flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                                <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 font-bold flex items-center justify-center border overflow-hidden">
                                    {u.avatarUrl ? <img src={u.avatarUrl} alt={u.name} className="w-full h-full object-cover" /> : u.name.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <h4 className="font-bold text-slate-800 text-sm flex items-center space-x-1">
                                        <span>{u.name}</span>
                                        {u.id === currentUser.id && <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.2 rounded font-bold">(Você)</span>}
                                    </h4>
                                    <p className="text-xs text-slate-400">{u.email}</p>
                                </div>
                            </div>

                            <div className="flex items-center space-x-3">
                                <select
                                    value={u.role}
                                    onChange={(e) => handleRoleChange(u.id, e.target.value)}
                                    disabled={u.id === currentUser.id}
                                    className="px-3 py-1.5 border rounded-xl text-xs font-bold bg-slate-50 outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                                >
                                    <option value="admin">Administrador</option>
                                    <option value="funcionario">Colaborador</option>
                                    <option value="pendente">Pendente / Bloquear</option>
                                </select>

                                {u.id !== currentUser.id && (
                                    <button onClick={() => handleDeleteUser(u.id)} className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}