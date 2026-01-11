'use client';

/**
 * Auth Context Provider
 * Provides authentication state across the dashboard app
 */

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';

interface AuthContextType {
    user: User | null;
    session: Session | null;
    isLoading: boolean;
    signOut: () => Promise<void>;
    getToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const supabase = createClient();

    // Get access token for API requests
    const getToken = useCallback(async (): Promise<string | null> => {
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        return currentSession?.access_token ?? null;
    }, [supabase]);

    // Sign out handler
    const signOut = useCallback(async () => {
        await supabase.auth.signOut();
        setUser(null);
        setSession(null);
    }, [supabase]);

    useEffect(() => {
        // Check session on mount
        const checkSession = async () => {
            try {
                const { data: { session: currentSession }, error } = await supabase.auth.getSession();
                if (error) {
                    console.error('Error getting session:', error);
                    return;
                }
                setSession(currentSession);
                setUser(currentSession?.user ?? null);
            } catch (err) {
                console.error('Failed to check session:', err);
            } finally {
                setIsLoading(false);
            }
        };

        checkSession();

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, newSession) => {
                setSession(newSession);
                setUser(newSession?.user ?? null);
                setIsLoading(false);
            }
        );

        // Cleanup subscription
        return () => {
            subscription.unsubscribe();
        };
    }, [supabase]);

    const value: AuthContextType = {
        user,
        session,
        isLoading,
        signOut,
        getToken,
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

/**
 * Hook to use auth context
 */
export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
