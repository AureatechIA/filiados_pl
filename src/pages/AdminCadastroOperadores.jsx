import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Loader2, UserPlus, Users, CheckCircle, AlertCircle, X } from 'lucide-react';

export default function AdminCadastroOperadores() {
    const [operadores, setOperadores] = useState([]);
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState({ type: '', text: '' });

    const [showForm, setShowForm] = useState(false);
    const [formData, setFormData] = useState({
        nome: '',
        email: '',
        role: 'diretorio',
        uf: '',
        municipio: '',
        operador_type: 'aurea',
        password: ''
    });
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
            if (formData.role === 'diretorio' && !formData.uf) {
                throw new Error('UF é obrigatório para perfil Diretorio.');
            }

            // The edge function requires an explicit, temporary password.
            const tempPassword = Math.random().toString(36).slice(-8) + 'A1!';

            const { data, error } = await supabase.functions.invoke('create-portal-user', {
                body: {
                    nome: formData.nome,
                    email: formData.email,
                    role: formData.role,
                    password: formData.password,
                    uf: formData.uf || null,
                    municipio: formData.municipio || null,
                    operador_type: formData.operador_type
                }
            });

            if (error) throw error;

            if (data?.error) {
                throw new Error(data.error);
            }

            setMessage({ type: 'success', text: `Operador criado com sucesso!` });
            setShowForm(false);
            setFormData({
                nome: '', email: '', role: 'diretorio', uf: '', municipio: '', operador_type: 'aurea', password: ''
            });
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
                            <label>Senha do Usuário</label>
                            <input
                                type="text"
                                required
                                value={formData.password}
                                onChange={e => setFormData({ ...formData, password: e.target.value })}
                                placeholder="Defina uma senha"
                            />
                        </div>

                        <div className="form-group">
                            <label>Perfil (Role)</label>
                            <select
                                value={formData.role}
                                onChange={e => setFormData({ ...formData, role: e.target.value })}
                                style={{ padding: '0.75rem', borderRadius: '0.5rem', background: 'var(--bg-lighter)', color: 'white', border: '1px solid var(--border)' }}
                            >
                                <option value="diretorio">Diretório (Operador de Envios)</option>
                                <option value="admin">Administrador Geral</option>
                                <option value="dev">Desenvolvedor (Dev)</option>
                            </select>
                        </div>

                        <div className="form-group" style={{ display: formData.role === 'diretorio' ? 'block' : 'none' }}>
                            <label>UF (Obrigatório para Diretório)</label>
                            <select
                                value={formData.uf}
                                onChange={e => setFormData({ ...formData, uf: e.target.value })}
                                style={{ padding: '0.75rem', borderRadius: '0.5rem', background: 'var(--bg-lighter)', color: 'white', border: '1px solid var(--border)' }}
                                required={formData.role === 'diretorio'}
                            >
                                <option value="">Selecione uf...</option>
                                {['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'].map(uf => (
                                    <option key={uf} value={uf}>{uf}</option>
                                ))}
                            </select>
                        </div>

                        <div className="form-group">
                            <label>Município Eleitoral (Opcional)</label>
                            <input
                                type="text"
                                value={formData.municipio}
                                onChange={e => setFormData({ ...formData, municipio: e.target.value })}
                                placeholder="Ex: São Paulo"
                            />
                        </div>

                        <div className="form-group">
                            <label>Tipo de Operador</label>
                            <select
                                value={formData.operador_type}
                                onChange={e => setFormData({ ...formData, operador_type: e.target.value })}
                                style={{ padding: '0.75rem', borderRadius: '0.5rem', background: 'var(--bg-lighter)', color: 'white', border: '1px solid var(--border)' }}
                            >
                                <option value="aurea">Aurea</option>
                                <option value="diretorio">Diretório</option>
                            </select>
                        </div>

                        <button type="submit" className="btn-primary" disabled={isSubmitting} style={{ marginTop: '1rem' }}>
                            {isSubmitting ? <Loader2 className="animate-spin" /> : 'Criar Operador'}
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
