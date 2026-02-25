// ═══════════════════════════════════════════════════════════════════
//  App.js  —  Complete Chat App (single file)
//  Screens: Login → Register → Contacts → AllUsers → Chat
// ═══════════════════════════════════════════════════════════════════

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
    View, Text, TextInput, TouchableOpacity, FlatList,
    StyleSheet, ActivityIndicator, Alert, KeyboardAvoidingView,
    Platform, StatusBar,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { io } from "socket.io-client";

// ─────────────────────────────────────────────────────────────────
//  🔧 CONFIG — change this to your server URL
// ─────────────────────────────────────────────────────────────────
const BASE_URL = "https://socket0-server.onrender.com";

// ─────────────────────────────────────────────────────────────────
//  SOCKET — singleton
// ─────────────────────────────────────────────────────────────────
let socket = null;

const connectSocket = (token) => {
    if (socket?.connected) return socket;
    socket = io(BASE_URL, {
        auth: { token },
        transports: ["websocket"],
        reconnection: true,
    });
    return socket;
};

const disconnectSocket = () => {
    socket?.disconnect();
    socket = null;
};

// ─────────────────────────────────────────────────────────────────
//  API helpers — plain fetch, no axios
// ─────────────────────────────────────────────────────────────────
const api = async (path, method = "GET", body = null, token = null) => {
    const headers = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;
    const res = await fetch(`${BASE_URL}${path}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : null,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Request failed");
    return data;
};

// ═══════════════════════════════════════════════════════════════════
//  SCREEN: LOGIN
// ═══════════════════════════════════════════════════════════════════
function LoginScreen({ onLogin, goToRegister }) {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);

    const handleLogin = async () => {
        if (!email.trim() || !password.trim()) return Alert.alert("Error", "Fill in all fields");
        try {
            setLoading(true);
            const data = await api("/api/auth/login", "POST", { email: email.trim(), password: password.trim() });
            onLogin(data.token, data.user);
        } catch (err) {
            Alert.alert("Login Failed", err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView style={s.screen} behavior={Platform.OS === "ios" ? "padding" : undefined}>
            <Text style={s.logo}>💬 ChatApp</Text>
            <Text style={s.sub}>Sign in to continue</Text>
            <TextInput style={s.input} placeholder="Email" placeholderTextColor="#555"
                autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} />
            <TextInput style={s.input} placeholder="Password" placeholderTextColor="#555"
                secureTextEntry value={password} onChangeText={setPassword} />
            <TouchableOpacity style={s.btn} onPress={handleLogin} disabled={loading}>
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.btnText}>Login</Text>}
            </TouchableOpacity>
            <TouchableOpacity onPress={goToRegister}>
                <Text style={s.link}>No account? <Text style={s.linkAccent}>Register</Text></Text>
            </TouchableOpacity>
        </KeyboardAvoidingView>
    );
}

// ═══════════════════════════════════════════════════════════════════
//  SCREEN: REGISTER
// ═══════════════════════════════════════════════════════════════════
function RegisterScreen({ onLogin, goToLogin }) {
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);

    const handleRegister = async () => {
        if (!name.trim() || !email.trim() || !password.trim()) return Alert.alert("Error", "Fill in all fields");
        if (password.length < 6) return Alert.alert("Error", "Password must be 6+ chars");
        try {
            setLoading(true);
            const data = await api("/api/auth/register", "POST", {
                name: name.trim(), email: email.trim(), password: password.trim(),
            });
            onLogin(data.token, data.user);
        } catch (err) {
            Alert.alert("Register Failed", err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView style={s.screen} behavior={Platform.OS === "ios" ? "padding" : undefined}>
            <Text style={s.logo}>💬 ChatApp</Text>
            <Text style={s.sub}>Create an account</Text>
            <TextInput style={s.input} placeholder="Full Name" placeholderTextColor="#555"
                value={name} onChangeText={setName} />
            <TextInput style={s.input} placeholder="Email" placeholderTextColor="#555"
                autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} />
            <TextInput style={s.input} placeholder="Password (min 6)" placeholderTextColor="#555"
                secureTextEntry value={password} onChangeText={setPassword} />
            <TouchableOpacity style={s.btn} onPress={handleRegister} disabled={loading}>
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.btnText}>Create Account</Text>}
            </TouchableOpacity>
            <TouchableOpacity onPress={goToLogin}>
                <Text style={s.link}>Have an account? <Text style={s.linkAccent}>Login</Text></Text>
            </TouchableOpacity>
        </KeyboardAvoidingView>
    );
}

// ═══════════════════════════════════════════════════════════════════
//  SCREEN: CONTACTS (Home)
//  — contacts state lives in App, passed as props (never unmounts)
// ═══════════════════════════════════════════════════════════════════
function ContactsScreen({ contacts, loading, currentUser, onLogout, onOpenChat, onAddContact }) {
    if (loading) return <View style={s.centered}><ActivityIndicator size="large" color="#6366f1" /></View>;

    return (
        <View style={s.container}>
            <View style={s.header}>
                <View>
                    <Text style={s.headerTitle}>Chats</Text>
                    <Text style={s.headerSub}>Hi, {currentUser?.name}</Text>
                </View>
                <View style={{ flexDirection: "row", gap: 8 }}>
                    <TouchableOpacity style={s.smallBtn} onPress={onAddContact}>
                        <Text style={s.smallBtnText}>+ Add</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[s.smallBtn, { backgroundColor: "#2a1010" }]} onPress={onLogout}>
                        <Text style={[s.smallBtnText, { color: "#f87171" }]}>Logout</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {contacts.length === 0 ? (
                <View style={s.centered}>
                    <Text style={{ fontSize: 40 }}>💬</Text>
                    <Text style={s.emptyText}>No contacts yet</Text>
                    <Text style={s.emptySub}>Tap "+ Add" to find people</Text>
                </View>
            ) : (
                <FlatList
                    data={contacts}
                    keyExtractor={i => i._id}
                    renderItem={({ item }) => {
                        const online = item.status === "online";
                        const initials = item.name?.[0]?.toUpperCase() || "?";
                        const preview = item.lastMessage?.message || "Tap to chat";
                        return (
                            <TouchableOpacity style={s.row} onPress={() => onOpenChat(item)}>
                                <View style={s.avatar}>
                                    <Text style={s.avatarText}>{initials}</Text>
                                    <View style={[s.dot, online ? s.dotOnline : s.dotOffline]} />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={s.name}>{item.name}</Text>
                                    <Text style={s.preview} numberOfLines={1}>{preview}</Text>
                                </View>
                                <Text style={{ color: online ? "#22c55e" : "#555", fontSize: 11 }}>
                                    {online ? "Online" : "Offline"}
                                </Text>
                            </TouchableOpacity>
                        );
                    }}
                />
            )}
        </View>
    );
}

// ═══════════════════════════════════════════════════════════════════
//  SCREEN: ALL USERS (Add Contact)
// ═══════════════════════════════════════════════════════════════════
function AllUsersScreen({ token, onBack }) {
    const [users, setUsers] = useState([]);
    const [search, setSearch] = useState("");
    const [loading, setLoading] = useState(true);
    const [adding, setAdding] = useState(null);

    useEffect(() => {
        (async () => {
            try {
                const data = await api("/api/users/contacts", "GET", null, token);
                setUsers(data);
            } catch (err) {
                Alert.alert("Error", err.message);
            } finally {
                setLoading(false);
            }
        })();
    }, [token]);

    const filtered = search.trim()
        ? users.filter(u =>
            u.name.toLowerCase().includes(search.toLowerCase()) ||
            u.email.toLowerCase().includes(search.toLowerCase()))
        : users;

    const handleAdd = async (contactId, name) => {
        try {
            setAdding(contactId);
            await api(`/api/users/add-contact/${contactId}`, "POST", null, token);
            Alert.alert("✅ Added", `${name} added to contacts`, [
                { text: "Back to Chats", onPress: onBack },
                { text: "OK" },
            ]);
        } catch (err) {
            Alert.alert("Error", err.message);
        } finally {
            setAdding(null);
        }
    };

    return (
        <View style={s.container}>
            <View style={s.header}>
                <TouchableOpacity onPress={onBack}>
                    <Text style={{ color: "#6366f1", fontSize: 22 }}>←</Text>
                </TouchableOpacity>
                <Text style={[s.headerTitle, { marginLeft: 12 }]}>Find People</Text>
            </View>

            <TextInput style={[s.input, { margin: 12 }]}
                placeholder="Search name or email..." placeholderTextColor="#555"
                value={search} onChangeText={setSearch} />

            {loading
                ? <View style={s.centered}><ActivityIndicator color="#6366f1" size="large" /></View>
                : <FlatList
                    data={filtered}
                    keyExtractor={i => i._id}
                    renderItem={({ item }) => {
                        const online = item.status === "online";
                        const initials = item.name?.[0]?.toUpperCase() || "?";
                        return (
                            <View style={s.row}>
                                <View style={s.avatar}>
                                    <Text style={s.avatarText}>{initials}</Text>
                                    <View style={[s.dot, online ? s.dotOnline : s.dotOffline]} />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={s.name}>{item.name}</Text>
                                    <Text style={{ color: "#555", fontSize: 12 }}>{item.email}</Text>
                                </View>
                                <TouchableOpacity
                                    style={s.smallBtn}
                                    onPress={() => handleAdd(item._id, item.name)}
                                    disabled={adding === item._id}>
                                    {adding === item._id
                                        ? <ActivityIndicator size="small" color="#fff" />
                                        : <Text style={s.smallBtnText}>+ Add</Text>}
                                </TouchableOpacity>
                            </View>
                        );
                    }}
                    ListEmptyComponent={
                        <View style={s.centered}><Text style={s.emptySub}>No users found</Text></View>
                    }
                />
            }
        </View>
    );
}

// ═══════════════════════════════════════════════════════════════════
//  SCREEN: CHAT
// ═══════════════════════════════════════════════════════════════════
function ChatScreen({ token, currentUser, contact, onBack, onMessageSent }) {
    const [messages, setMessages] = useState([]);
    const [text, setText] = useState("");
    const [loading, setLoading] = useState(true);
    const [isTyping, setIsTyping] = useState(false);
    const [contactOnline, setContactOnline] = useState(contact.status === "online");
    const flatRef = useRef(null);
    const typingTimer = useRef(null);

    useEffect(() => {
        // Load message history
        (async () => {
            try {
                const history = await api(`/api/users/messages/${contact._id}`, "GET", null, token);
                const sorted = [...history].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
                setMessages(sorted);
            } catch (err) {
                console.log("History error:", err.message);
            } finally {
                setLoading(false);
            }
        })();

        socket?.emit("check_user_status", contact._id);

        // Named handlers so we only remove OURS on cleanup
        const onReceive = (msg) => {
            if (msg.user._id !== contact._id) return;
            setMessages(prev => [...prev, msg]);
            socket?.emit("message_read", { messageId: msg._id, senderId: contact._id });
        };
        const onSent = (msg) => {
            // Replace temp message with confirmed one
            setMessages(prev => prev.map(m =>
                m._id.startsWith("temp-") ? { ...m, _id: msg._id, status: msg.status } : m
            ));
        };
        const onStatusUpdate = ({ messageId, status }) => {
            setMessages(prev => prev.map(m => m._id === messageId ? { ...m, status } : m));
        };
        const onActivity = ({ userId, activity }) => {
            if (userId !== contact._id) return;
            if (activity === "typing") {
                setIsTyping(true);
                clearTimeout(typingTimer.current);
                typingTimer.current = setTimeout(() => setIsTyping(false), 2500);
            }
        };
        const onUserStatus = ({ userId, status }) => { if (userId === contact._id) setContactOnline(status === "online"); };
        const onStatusChanged = ({ userId, status }) => { if (userId === contact._id) setContactOnline(status === "online"); };

        socket?.on("receive_message", onReceive);
        socket?.on("message_sent", onSent);
        socket?.on("message_status_updated", onStatusUpdate);
        socket?.on("contact_activity", onActivity);
        socket?.on("user_status", onUserStatus);
        socket?.on("user_status_changed", onStatusChanged);

        return () => {
            // Remove ONLY our specific handlers
            socket?.off("receive_message", onReceive);
            socket?.off("message_sent", onSent);
            socket?.off("message_status_updated", onStatusUpdate);
            socket?.off("contact_activity", onActivity);
            socket?.off("user_status", onUserStatus);
            socket?.off("user_status_changed", onStatusChanged);
            clearTimeout(typingTimer.current);
        };
    }, [contact._id, token]);

    useEffect(() => {
        if (messages.length > 0)
            setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 80);
    }, [messages]);

    const sendMessage = () => {
        const trimmed = text.trim();
        if (!trimmed) return;

        const tempId = `temp-${Date.now()}`;
        const temp = {
            _id: tempId,
            text: trimmed,
            createdAt: new Date().toISOString(),
            status: "sending",
            user: { _id: currentUser.id || currentUser._id, name: currentUser.name },
        };
        setMessages(prev => [...prev, temp]);
        setText("");

        socket?.emit("send_message", { receiverId: contact._id, message: trimmed });

        // Also notify App level to update contacts preview immediately
        onMessageSent?.(contact._id, trimmed);
    };

    const handleTyping = (val) => {
        setText(val);
        socket?.emit("user_activity", { receiverId: contact._id, activity: "typing" });
    };

    const myId = currentUser.id || currentUser._id;

    const renderMsg = ({ item }) => {
        const isMe = item.user._id === myId;
        const statusIcon =
            item.status === "read" ? "✓✓" :
                item.status === "delivered" ? "✓✓" :
                    item.status === "sent" ? "✓" :
                        item.status === "sending" ? "⏳" : "";
        const statusColor = item.status === "read" ? "#a5b4fc" : "rgba(255,255,255,0.4)";

        return (
            <View style={{ flexDirection: "row", justifyContent: isMe ? "flex-end" : "flex-start", marginBottom: 8 }}>
                <View style={[s.bubble, isMe ? s.bubbleMe : s.bubbleThem]}>
                    <Text style={{ color: "#fff", fontSize: 15 }}>{item.text}</Text>
                    <View style={{ flexDirection: "row", justifyContent: "flex-end", marginTop: 4, gap: 4 }}>
                        <Text style={{ color: "rgba(255,255,255,0.5)", fontSize: 10 }}>
                            {new Date(item.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </Text>
                        {isMe && <Text style={{ fontSize: 10, color: statusColor }}>{statusIcon}</Text>}
                    </View>
                </View>
            </View>
        );
    };

    return (
        <KeyboardAvoidingView style={s.container} behavior={Platform.OS === "ios" ? "padding" : undefined}>
            <View style={s.header}>
                <TouchableOpacity onPress={onBack}>
                    <Text style={{ color: "#6366f1", fontSize: 22 }}>←</Text>
                </TouchableOpacity>
                <View style={[s.avatar, { marginLeft: 10, marginRight: 10 }]}>
                    <Text style={s.avatarText}>{contact.name?.[0]?.toUpperCase()}</Text>
                </View>
                <View style={{ flex: 1 }}>
                    <Text style={s.name}>{contact.name}</Text>
                    <Text style={{ fontSize: 12, color: isTyping ? "#a5b4fc" : contactOnline ? "#22c55e" : "#555" }}>
                        {isTyping ? "typing..." : contactOnline ? "Online" : "Offline"}
                    </Text>
                </View>
            </View>

            {loading
                ? <View style={s.centered}><ActivityIndicator color="#6366f1" size="large" /></View>
                : <FlatList
                    ref={flatRef}
                    data={messages}
                    keyExtractor={i => i._id}
                    contentContainerStyle={{ padding: 12, paddingBottom: 8, flexGrow: 1 }}
                    onContentSizeChange={() => flatRef.current?.scrollToEnd({ animated: false })}
                    renderItem={renderMsg}
                    ListEmptyComponent={
                        <View style={s.centered}>
                            <Text style={s.emptySub}>No messages yet. Say hello! 👋</Text>
                        </View>
                    }
                />
            }

            <View style={s.inputBar}>
                <TextInput
                    style={s.chatInput}
                    placeholder="Type a message..."
                    placeholderTextColor="#555"
                    value={text}
                    onChangeText={handleTyping}
                    multiline
                    maxLength={1000}
                />
                <TouchableOpacity
                    style={[s.sendBtn, !text.trim() && { backgroundColor: "#222" }]}
                    onPress={sendMessage}
                    disabled={!text.trim()}>
                    <Text style={{ color: "#fff", fontSize: 16 }}>➤</Text>
                </TouchableOpacity>
            </View>
        </KeyboardAvoidingView>
    );
}

// ═══════════════════════════════════════════════════════════════════
//  ROOT APP
// ═══════════════════════════════════════════════════════════════════
export default function App() {
    const [screen, setScreen] = useState("login");
    const [token, setToken] = useState(null);
    const [currentUser, setCurrentUser] = useState(null);
    const [selectedContact, setSelectedContact] = useState(null);
    const [bootstrapping, setBootstrapping] = useState(true);

    // ── Contacts state lives HERE — never unmounts ──────────────
    const [contacts, setContacts] = useState([]);
    const [contactsLoading, setContactsLoading] = useState(false);

    // Ref so socket listeners can read latest selectedContact
    // without being re-registered every time it changes
    const selectedContactRef = useRef(null);
    useEffect(() => { selectedContactRef.current = selectedContact; }, [selectedContact]);

    const loadContacts = useCallback(async (tok) => {
        const t = tok || token;
        if (!t) return;
        setContactsLoading(true);
        try {
            const data = await api("/api/users/my-contacts", "GET", null, t);
            setContacts(data);
        } catch (err) {
            console.log("loadContacts error:", err.message);
        } finally {
            setContactsLoading(false);
        }
    }, [token]);

    // ── App-level socket listeners — registered ONCE after login ─
    // Uses named functions so .off() removes only OUR listener,
    // NOT the ones registered by ChatScreen for the same events.
    useEffect(() => {
        if (!token) return;

        // Small delay ensures socket instance is assigned
        const timer = setTimeout(() => {
            if (!socket) return;

            const onReceive = (msg) => {
                // Someone sent us a message → update their preview in the list
                setContacts(prev => prev.map(c =>
                    c._id === msg.user._id
                        ? { ...c, lastMessage: { message: msg.text, createdAt: msg.createdAt } }
                        : c
                ));
            };

            const onStatusChange = ({ userId, status }) => {
                // Update online/offline dot
                setContacts(prev => prev.map(c =>
                    c._id === userId ? { ...c, status } : c
                ));
            };

            // Attach named refs to socket so cleanup can find them
            socket._appOnReceive = onReceive;
            socket._appOnStatusChange = onStatusChange;

            socket.on("receive_message", onReceive);
            socket.on("user_status_changed", onStatusChange);
        }, 150);

        return () => {
            clearTimeout(timer);
            if (socket) {
                socket.off("receive_message", socket._appOnReceive);
                socket.off("user_status_changed", socket._appOnStatusChange);
            }
        };
    }, [token]); // only [token] — NOT selectedContact

    // Called by ChatScreen when WE send a message
    // Updates the contact preview immediately without waiting for socket
    const handleMessageSent = useCallback((contactId, text) => {
        setContacts(prev => prev.map(c =>
            c._id === contactId
                ? { ...c, lastMessage: { message: text, createdAt: new Date().toISOString() } }
                : c
        ));
    }, []);

    // ── Session restore on app start ─────────────────────────────
    useEffect(() => {
        (async () => {
            try {
                const savedToken = await AsyncStorage.getItem("token");
                const savedUser = await AsyncStorage.getItem("user");
                if (savedToken && savedUser) {
                    const user = JSON.parse(savedUser);
                    setToken(savedToken);
                    setCurrentUser(user);
                    connectSocket(savedToken);
                    await loadContacts(savedToken);
                    setScreen("contacts");
                }
            } catch (_) { }
            finally { setBootstrapping(false); }
        })();
    }, []);

    const handleLogin = async (newToken, newUser) => {
        await AsyncStorage.setItem("token", newToken);
        await AsyncStorage.setItem("user", JSON.stringify(newUser));
        setToken(newToken);
        setCurrentUser(newUser);
        connectSocket(newToken);
        await loadContacts(newToken);
        setScreen("contacts");
    };

    const handleLogout = async () => {
        await AsyncStorage.removeItem("token");
        await AsyncStorage.removeItem("user");
        disconnectSocket();
        setToken(null);
        setCurrentUser(null);
        setContacts([]);
        setScreen("login");
    };

    const handleBackFromChat = () => {
        setScreen("contacts");
        loadContacts(); // re-sync in case anything was missed
    };

    if (bootstrapping) {
        return <View style={s.centered}><ActivityIndicator size="large" color="#6366f1" /></View>;
    }

    return (
        <View style={{ flex: 1 }}>
            <StatusBar barStyle="light-content" backgroundColor="#111" />

            {screen === "login" &&
                <LoginScreen onLogin={handleLogin} goToRegister={() => setScreen("register")} />
            }
            {screen === "register" &&
                <RegisterScreen onLogin={handleLogin} goToLogin={() => setScreen("login")} />
            }
            {screen === "contacts" &&
                <ContactsScreen
                    contacts={contacts}
                    loading={contactsLoading}
                    currentUser={currentUser}
                    onLogout={handleLogout}
                    onOpenChat={(contact) => { setSelectedContact(contact); setScreen("chat"); }}
                    onAddContact={() => setScreen("allUsers")}
                />
            }
            {screen === "allUsers" &&
                <AllUsersScreen
                    token={token}
                    onBack={() => { setScreen("contacts"); loadContacts(); }}
                />
            }
            {screen === "chat" && selectedContact &&
                <ChatScreen
                    token={token}
                    currentUser={currentUser}
                    contact={selectedContact}
                    onBack={handleBackFromChat}
                    onMessageSent={handleMessageSent}
                />
            }
        </View>
    );
}

// ═══════════════════════════════════════════════════════════════════
//  STYLES
// ═══════════════════════════════════════════════════════════════════
const s = StyleSheet.create({
    screen: { flex: 1, backgroundColor: "#111", justifyContent: "center", padding: 24 },
    container: { flex: 1, backgroundColor: "#111" },
    centered: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#111" },

    logo: { fontSize: 32, fontWeight: "bold", color: "#fff", textAlign: "center", marginBottom: 6 },
    sub: { fontSize: 14, color: "#555", textAlign: "center", marginBottom: 32 },
    name: { fontSize: 15, fontWeight: "600", color: "#fff" },
    preview: { fontSize: 13, color: "#555", marginTop: 2 },
    emptyText: { fontSize: 18, color: "#fff", fontWeight: "600", marginTop: 12 },
    emptySub: { fontSize: 14, color: "#555", marginTop: 6 },
    link: { color: "#666", textAlign: "center", fontSize: 14, marginTop: 4 },
    linkAccent: { color: "#6366f1", fontWeight: "bold" },

    input: {
        backgroundColor: "#1a1a1a", color: "#fff", padding: 14,
        borderRadius: 10, marginBottom: 12, fontSize: 15,
        borderWidth: 1, borderColor: "#2a2a2a",
    },
    btn: {
        backgroundColor: "#6366f1", padding: 15,
        borderRadius: 10, alignItems: "center", marginBottom: 16,
    },
    btnText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
    smallBtn: {
        backgroundColor: "#6366f1", paddingHorizontal: 12,
        paddingVertical: 7, borderRadius: 8, alignItems: "center",
    },
    smallBtnText: { color: "#fff", fontWeight: "bold", fontSize: 13 },

    header: {
        flexDirection: "row", alignItems: "center",
        paddingTop: Platform.OS === "ios" ? 52 : 40,
        paddingBottom: 14, paddingHorizontal: 16,
        borderBottomWidth: 1, borderBottomColor: "#1e1e1e",
        backgroundColor: "#111",
    },
    headerTitle: { fontSize: 22, fontWeight: "bold", color: "#fff" },
    headerSub: { fontSize: 12, color: "#555", marginTop: 2 },

    row: {
        flexDirection: "row", alignItems: "center",
        padding: 14, borderBottomWidth: 1, borderBottomColor: "#1a1a1a",
    },
    avatar: {
        width: 46, height: 46, borderRadius: 23,
        backgroundColor: "#6366f1", alignItems: "center", justifyContent: "center",
        marginRight: 12, position: "relative",
    },
    avatarText: { color: "#fff", fontSize: 17, fontWeight: "bold" },
    dot: {
        width: 11, height: 11, borderRadius: 6,
        position: "absolute", bottom: 0, right: 0,
        borderWidth: 2, borderColor: "#111",
    },
    dotOnline: { backgroundColor: "#22c55e" },
    dotOffline: { backgroundColor: "#555" },

    bubble: { maxWidth: "78%", padding: 12, borderRadius: 16 },
    bubbleMe: { backgroundColor: "#6366f1", borderBottomRightRadius: 4 },
    bubbleThem: { backgroundColor: "#1e1e1e", borderBottomLeftRadius: 4 },

    inputBar: {
        flexDirection: "row", alignItems: "flex-end",
        padding: 10, paddingHorizontal: 12,
        borderTopWidth: 1, borderTopColor: "#1a1a1a",
        backgroundColor: "#111",
    },
    chatInput: {
        flex: 1, backgroundColor: "#1a1a1a", color: "#fff",
        borderRadius: 24, paddingHorizontal: 16, paddingVertical: 10,
        fontSize: 15, maxHeight: 120, marginRight: 10,
        borderWidth: 1, borderColor: "#2a2a2a",
    },
    sendBtn: {
        width: 44, height: 44, borderRadius: 22,
        backgroundColor: "#6366f1", alignItems: "center", justifyContent: "center",
    },
});
