import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Loader2, Send, CheckCircle, AlertTriangle, Search, RefreshCw } from 'lucide-react';

const TARGET_CAMPAIGN_ID = 'd2c67829-6cf2-4887-bb8a-faeaab85cbfd';

export default function UserDashboard() {
    const { user, signOut } = useAuth();

    const [filiadoAtual, setFiliadoAtual] = useState(null);
    const [campanhaAtual, setCampanhaAtual] = useState(null);

    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });

    const initDashboard = useCallback(async () => {
        setLoading(true);
        try {
            await fetchCampanha();
            await fetchMeuFiliadoPendente();
        } catch (err) {
            console.error('Erro na inicialização:', err);
            setMessage({ type: 'error', text: 'Erro ao conectar. Tente atualizar a página.' });
        } finally {
            setLoading(false);
        }
    }, [user?.id]);

    useEffect(() => {
        if (user?.id) {
            initDashboard();
        }
    }, [user?.id, initDashboard]);

    const fetchCampanha = async () => {
        try {
            const { data, error } = await supabase
                .from('followup_campanhas')
                .select('id, nome, status')
                .eq('id', TARGET_CAMPAIGN_ID)
                .single();

            if (!error && data) {
                setCampanhaAtual(data);
            } else {
                console.warn('Campanha específica não encontrada ou inativa.');
            }
        } catch (err) {
            console.error('Erro ao buscar campanha:', err);
        }
    };

    const fetchMeuFiliadoPendente = async () => {
        if (!user?.id) return;
        try {
            const { data, error } = await supabase
                .from('filiados')
                .select('id, nome, telefone, municipio_eleitoral, uf_ddd')
                .eq('portal_user_id', user.id)
                .eq('lista_manual', false)
                .order('created_at', { ascending: true })
                .limit(1)
                .single();

            if (data) {
                setFiliadoAtual(data);
            } else {
                setFiliadoAtual(null);
            }
        } catch (err) {
            if (err.code !== 'PGRST116') {
                console.error('Erro ao buscar filiado pendente:', err);
            }
            setFiliadoAtual(null);
        }
    };

    const handlePegarNovo = async () => {
        if (!user?.id) return;
        setProcessing(true);
        setMessage({ type: '', text: '' });

        try {
            const { data: livre, error: errorFetch } = await supabase
                .from('filiados')
                .select('id')
                .is('portal_user_id', null)
                .is('enviado_n8n', null)
                .eq('lista_manual', false)
                .neq('uf_ddd', 'DF')
                .limit(1)
                .single();

            if (errorFetch || !livre) {
                setMessage({ type: 'error', text: 'Nenhum contato disponível no momento.' });
                setProcessing(false);
                return;
            }

            const { data: claimsSuccess, error: errorClaim } = await supabase.rpc('claim_filiado', {
                p_filiado_id: livre.id
            });

            if (errorClaim) throw errorClaim;

            if (claimsSuccess) {
                await fetchMeuFiliadoPendente();
            } else {
                setMessage({ type: 'warning', text: 'Buscando próximo...' });
                setTimeout(handlePegarNovo, 300);
            }

        } catch (err) {
            console.error(err);
            setMessage({ type: 'error', text: 'Falha ao buscar dados.' });
        } finally {
            setProcessing(false);
        }
    };

    const handleFinalizar = async (resultado, erroCodigo = null) => {
        if (!campanhaAtual || !filiadoAtual) {
            setMessage({ type: 'error', text: 'Dados insuficientes para finalizar.' });
            return;
        }

        setProcessing(true);
        setMessage({ type: '', text: '' });

        try {
            const { data: success, error } = await supabase.rpc('finalizar_contato_manual', {
                p_filiado_id: filiadoAtual.id,
                p_campanha_id: campanhaAtual.id,
                p_telefone: filiadoAtual.telefone || '',
                p_resultado: resultado,
                p_erro_codigo: erroCodigo
            });

            if (error) throw error;

            if (success) {
                setFiliadoAtual(null);
                setMessage({ type: 'success', text: 'Finalizado! Pegue o próximo.' });
            } else {
                setMessage({ type: 'error', text: 'Erro ao salvar. Verifique sua conexão.' });
            }
        } catch (err) {
            console.error(err);
            setMessage({ type: 'error', text: 'Erro ao processar contato.' });
        } finally {
            setProcessing(false);
        }
    };

    const enviarWhatsApp = () => {
        if (!filiadoAtual?.telefone) return;

        const fone = filiadoAtual.telefone.replace(/\D/g, '');
        const nomeUpper = (filiadoAtual.nome || '').toUpperCase();

        const mensagem = `Parabéns, ${nomeUpper}!!\nSua filiação ao Partido Liberal foi aprovada com sucesso.\nAcesse o link abaixo para receber sua carteirinha.\n\nhttps://queromefiliaraopl.com.br/carteirinha`;

        const url = `https://wa.me/${fone}?text=${encodeURIComponent(mensagem)}`;
        window.open(url, '_blank');

        setMessage({ type: 'success', text: 'WhatsApp aberto!' });
        setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    };

    if (loading) {
        return (
            <div className="loader-container">
                <div style={{ textAlign: 'center' }}>
                    <Loader2 className="spinner" />
                    <p style={{ marginTop: '1rem', color: 'var(--text-muted)' }}>Conectando à fila...</p>
                </div>
            </div>
        );
    }

    if (!user) {
        return (
            <div className="loader-container">
                <div style={{ textAlign: 'center', padding: '2rem' }}>
                    <AlertTriangle size={48} color="var(--warning)" style={{ marginBottom: '1rem' }} />
                    <h3>Sessão expirada</h3>
                    <button className="btn-primary" style={{ marginTop: '1rem' }} onClick={() => window.location.reload()}>
                        Recarregar Página
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div style={{ width: '100%', maxWidth: '500px', margin: '0 auto', padding: '0.5rem' }}>
            <div className="page-header" style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
                <h1 className="page-title" style={{ fontSize: '1.25rem' }}>Operação Manual</h1>
                {campanhaAtual && (
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Campanha: {campanhaAtual.nome}</p>
                )}
            </div>

            {message.text && (
                <div
                    className={`badge ${message.type === 'success' ? 'badge-success' : message.type === 'warning' ? 'badge-warning' : 'error-message'}`}
                    style={{ marginBottom: '1rem', padding: '0.75rem', borderRadius: '8px', width: '100%', display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center', fontSize: '0.875rem' }}
                >
                    {message.text}
                </div>
            )}

            <div className="card" style={{ padding: '1.5rem', minHeight: '300px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>

                {!filiadoAtual ? (
                    <div className="empty-state">
                        <Search size={40} style={{ marginBottom: '1rem', opacity: 0.5 }} />
                        <h3 style={{ fontSize: '1.1rem', marginBottom: '1.5rem' }}>Fila disponível</h3>
                        <button
                            className="btn-primary"
                            style={{ padding: '1.25rem', width: '100%' }}
                            onClick={handlePegarNovo}
                            disabled={processing}
                        >
                            {processing ? <Loader2 className="spinner" /> : 'PEGAR PRÓXIMO'}
                        </button>
                    </div>
                ) : (
                    <div style={{ animation: 'slideUp 0.3s ease-out' }}>
                        <div style={{ marginBottom: '1.5rem' }}>
                            <h2 style={{ fontSize: '1.25rem', marginBottom: '0.25rem' }}>{filiadoAtual.nome || 'SEM NOME'}</h2>
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                                {filiadoAtual.municipio_eleitoral} - {filiadoAtual.uf_ddd}
                            </p>
                        </div>

                        <div style={{
                            background: 'rgba(255,255,255,0.03)',
                            padding: '1.25rem',
                            borderRadius: '12px',
                            marginBottom: '1.5rem',
                            border: '1px solid var(--border)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '1rem'
                        }}>
                            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', letterSpacing: '1px', textAlign: 'center' }}>
                                {filiadoAtual.telefone || 'SEM NÚMERO'}
                            </div>

                            <button
                                onClick={enviarWhatsApp}
                                className="btn-primary"
                                style={{ background: '#25D366', border: 'none' }}
                                disabled={processing}
                            >
                                <Send size={20} />
                                ENVIAR NO WHATSAPP
                            </button>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            <button
                                className="btn-primary"
                                style={{ background: 'var(--success)', padding: '1rem' }}
                                onClick={() => handleFinalizar('sucesso')}
                                disabled={processing}
                            >
                                <CheckCircle size={20} />
                                FOI ENVIADO
                            </button>

                            <button
                                className="btn-primary"
                                style={{ background: 'var(--warning)', padding: '0.75rem' }}
                                onClick={() => handleFinalizar('falha', 400)}
                                disabled={processing}
                            >
                                <AlertTriangle size={18} />
                                NÚMERO INVÁLIDO
                            </button>
                        </div>

                        <button
                            onClick={initDashboard}
                            style={{ marginTop: '1.5rem', color: 'var(--text-muted)', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px', margin: '1.5rem auto 0' }}
                        >
                            <RefreshCw size={12} /> Sincronizar dados
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

