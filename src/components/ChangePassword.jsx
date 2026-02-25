import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Loader2, Lock, AlertCircle } from 'lucide-react';

export default function ChangePassword({ onSuccess }) {
    const { user, refreshSession } = useAuth();
    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (password.length < 6) {
            return setError('A senha deve ter pelo menos 6 caracteres.');
        }
        if (password !== confirm) {
            return setError('As senhas não coincidem.');
        }

        setLoading(true);
        try {
            const { error: authError } = await supabase.auth.updateUser({ password });
            if (authError) throw authError;

            // Marcar como alterada no portal_users
            const { error: dbError } = await supabase
                .from('portal_users')
                .update({ senha_alterada: true })
                .eq('id', user.id);

            if (dbError) throw dbError;

            await refreshSession(); // Atualiza o state global para liberar UI
            if (onSuccess) onSuccess();

        } catch (err) {
            console.error(err);
            setError(err.message || 'Erro ao alterar a senha.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ maxWidth: '400px', margin: '2rem auto', textAlign: 'center' }}>
            <div className="card" style={{ padding: '2rem' }}>
                <Lock size={48} style={{ color: 'var(--primary)', margin: '0 auto 1rem auto' }} />
                <h2 style={{ marginBottom: '0.5rem' }}>Alteração de Senha Obrigatória</h2>
                <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
                    Por motivos de segurança, você precisa definir sua própria senha definitiva antes de acessar a fila de operadores.
                </p>

                {error && (
                    <div className="error-message" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', justifyContent: 'center' }}>
                        <AlertCircle size={16} /> {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div className="form-group" style={{ textAlign: 'left' }}>
                        <label>Nova Senha</label>
                        <input
                            type="password"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Mínimo 6 caracteres"
                        />
                    </div>
                    <div className="form-group" style={{ textAlign: 'left' }}>
                        <label>Confirmar Senha</label>
                        <input
                            type="password"
                            required
                            value={confirm}
                            onChange={(e) => setConfirm(e.target.value)}
                            placeholder="Repita a senha"
                        />
                    </div>

                    <button type="submit" className="btn-primary" disabled={loading} style={{ marginTop: '1rem' }}>
                        {loading ? <Loader2 className="animate-spin" /> : 'Salvar Senha e Acessar Fila'}
                    </button>
                </form>
            </div>
        </div>
    );
}
