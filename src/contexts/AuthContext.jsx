import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [role, setRole] = useState(null);
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
                .select('role')
                .eq('id', authUser.id)
                .single();

            if (error) {
                console.error("Error fetching user role:", error);
            }

            setUser(authUser);
            setRole(portalUser?.role || 'user'); // Fallback to 'user' if not found
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

    return (
        <AuthContext.Provider value={{ user, role, loading, signIn, signOut }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    return useContext(AuthContext);
};
