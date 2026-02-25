import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Loader2, UserPlus, Users, CheckCircle, AlertCircle, X } from 'lucide-react';

export default function AdminCadastroOperadores() {
    const [operadores, setOperadores] = useState([]);
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState({ type: '', text: '' });

    const [showForm, setShowForm] = useState(false);
    const [formData, setFormData] = useState({ nome: '', email: '', role: 'operador' });
    const [isSubmitting, setIsSubmitting] = useState(false);

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

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        setMessage({ type: '', text: '' });

        try {
            // The edge function requires an explicit, temporary password.
            // We generate a secure default one here.
            const tempPassword = Math.random().toString(36).slice(-8) + 'A1!';

            const { data, error } = await supabase.functions.invoke('create_operador', {
                body: {
                    nome: formData.nome,
                    email: formData.email,
                    role: formData.role,
                    password: tempPassword
                }
            });

            if (error) throw error;

            if (data?.error) {
                throw new Error(data.error);
            }

            setMessage({ type: 'success', text: `Criado! Anote a Senha Provisória para o usuário: ${tempPassword}` });
            setShowForm(false);
            setFormData({ nome: '', email: '', role: 'operador' });
            fetchOperadores();

        } catch (err) {
            console.error(err);
            setMessage({ type: 'error', text: err.message || 'Erro ao criar operador. O e-mail já existe?' });
        } finally {
            setIsSubmitting(false);
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
                <button
                    className="btn-primary"
                    style={{ width: 'auto' }}
                    onClick={() => setShowForm(!showForm)}
                >
                    {showForm ? <X size={18} /> : <UserPlus size={18} />}
                    {showForm ? 'Cancelar' : 'Novo Operador'}
                </button>
            </div>

            {showForm && (
                <div className="card" style={{ padding: '2rem', marginBottom: '2rem' }}>
                    <h2 style={{ marginBottom: '1.5rem', fontSize: '1.25rem' }}>Cadastrar Novo Membro</h2>
                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

                        <div className="form-group">
                            <label>Nome Completo</label>
                            <input
                                type="text"
                                required
                                value={formData.nome}
                                onChange={e => setFormData({ ...formData, nome: e.target.value })}
                                placeholder="Ex: João Silva"
                            />
                        </div>

                        <div className="form-group">
                            <label>E-mail</label>
                            <input
                                type="email"
                                required
                                value={formData.email}
                                onChange={e => setFormData({ ...formData, email: e.target.value })}
                                placeholder="Ex: joao@email.com"
                            />
                        </div>

                        <div className="form-group">
                            <label>Perfil (Role)</label>
                            <select
                                value={formData.role}
                                onChange={e => setFormData({ ...formData, role: e.target.value })}
                                style={{ padding: '0.75rem', borderRadius: '0.5rem', background: 'var(--bg-lighter)', color: 'white', border: '1px solid var(--border)' }}
                            >
                                <option value="operador">Operador (Envios)</option>
                                <option value="admin">Administrador Geral</option>
                            </select>
                        </div>

                        <button type="submit" className="btn-primary" disabled={isSubmitting} style={{ marginTop: '1rem' }}>
                            {isSubmitting ? <Loader2 className="animate-spin" /> : 'Criar Operador e Gerar Senha'}
                        </button>
                    </form>
                </div>
            )}

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
