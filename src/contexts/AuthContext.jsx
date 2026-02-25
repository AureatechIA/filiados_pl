import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [role, setRole] = useState(null);
    const [senhaAlterada, setSenhaAlterada] = useState(true);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Check active sessions and sets the user
        const checkSession = async () => {
            const { data: { session }, error } = await supabase.auth.getSession();

            if (session?.user) {
                await fetchRoleAndSetUser(session.user);
            } else {
                setUser(null);
                setRole(null);
                setLoading(false);
            }
        };

        checkSession();

        // Listen for changes on auth state (log in, log out, etc.)
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
            if (session?.user) {
                await fetchRoleAndSetUser(session.user);
            } else {
                setUser(null);
                setRole(null);
                setLoading(false);
            }
        });

        return () => {
            subscription?.unsubscribe();
        };
    }, []);

    const fetchRoleAndSetUser = async (authUser) => {
        setLoading(true);
        try {
            const { data: portalUser, error } = await supabase
                .from('portal_users')
                .select('role, senha_alterada')
                .eq('id', authUser.id)
                .single();

            if (error) {
                console.error("Error fetching user role:", error);
            }

            setUser(authUser);
            setRole(portalUser?.role || 'user'); // Fallback to 'user' if not found
            // Fallback true in case column is purely null from old setups
            setSenhaAlterada(portalUser?.senha_alterada ?? true);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const signIn = async (email, password) => {
        return supabase.auth.signInWithPassword({ email, password });
    };

    const signOut = async () => {
        return supabase.auth.signOut();
    };

    // Refresh trigger to allow manual auth user refresh without logging out
    const refreshSession = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) await fetchRoleAndSetUser(session.user);
    };

    return (
        <AuthContext.Provider value={{ user, role, senhaAlterada, loading, signIn, signOut, refreshSession }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    return useContext(AuthContext);
};
