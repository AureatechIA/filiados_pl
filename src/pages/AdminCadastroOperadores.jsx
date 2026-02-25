import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Loader2, UserPlus, Users, CheckCircle, AlertCircle } from 'lucide-react';

export default function AdminCadastroOperadores() {
    const [operadores, setOperadores] = useState([]);
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState({ type: '', text: '' });

    useEffect(() => {
        fetchOperadores();
    }, []);

    const fetchOperadores = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('portal_users')
                .select('id, nome, email, role, ativo, created_at')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setOperadores(data || []);
        } catch (err) {
            console.error(err);
            setMessage({ type: 'error', text: 'Erro ao carregar a lista de operadores.' });
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="loader-container">
                <Loader2 className="spinner" />
            </div>
        );
    }

    return (
        <div>
            <div className="page-header" style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h1 className="page-title">Cadastro de Operadores</h1>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
                        Gerencie os usuários e diretores com acesso ao sistema.
                    </p>
                </div>
                <button className="btn-primary" style={{ width: 'auto' }}>
                    <UserPlus size={18} />
                    Novo Operador
                </button>
            </div>

            {message.text && (
                <div className={`error-message ${message.type === 'success' ? 'badge-success' : ''}`} style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center' }}>
                    {message.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
                    {message.text}
                </div>
            )}

            <div className="card">
                <div className="table-container">
                    {operadores.length === 0 ? (
                        <div className="empty-state">
                            <Users size={48} />
                            <p>Nenhum operador cadastrado no sistema.</p>
                        </div>
                    ) : (
                        <table>
                            <thead>
                                <tr>
                                    <th>Nome</th>
                                    <th>Email</th>
                                    <th>Role</th>
                                    <th>Status</th>
                                    <th>Criado em</th>
                                </tr>
                            </thead>
                            <tbody>
                                {operadores.map(op => (
                                    <tr key={op.id}>
                                        <td>{op.nome || '-'}</td>
                                        <td>{op.email || '-'}</td>
                                        <td>
                                            <span className="badge badge-warning" style={{ textTransform: 'capitalize' }}>
                                                {op.role}
                                            </span>
                                        </td>
                                        <td>
                                            {op.ativo ? (
                                                <span className="badge badge-success">Ativo</span>
                                            ) : (
                                                <span className="badge" style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#fca5a5' }}>Inativo</span>
                                            )}
                                        </td>
                                        <td>{op.created_at ? new Date(op.created_at).toLocaleDateString('pt-BR') : '-'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
}
