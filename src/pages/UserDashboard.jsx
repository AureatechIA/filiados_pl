import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Loader2, Copy, CheckCircle, AlertTriangle, XCircle, Search } from 'lucide-react';

export default function UserDashboard() {
    const { user } = useAuth();

    const [filiadoAtual, setFiliadoAtual] = useState(null);
    const [campanhaAtual, setCampanhaAtual] = useState(null);

    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });

    useEffect(() => {
        fetchCampanha().then(() => fetchMeuFiliadoPendente());
    }, []);

    const fetchCampanha = async () => {
        try {
            const { data, error } = await supabase
                .from('followup_campanhas')
                .select('id, nome, status')
                .in('status', ['em_andamento', 'pendente'])
                .order('created_at', { ascending: false })
                .limit(1)
                .single();

            if (!error && data) {
                setCampanhaAtual(data);
            }
        } catch (err) {
            console.error('Nenhuma campanha ativa encontrada', err);
        }
    };

    // Se o usuário já tiver pego um e não finalizou, ele precisa obrigatoriamente aparecer
    const fetchMeuFiliadoPendente = async () => {
        setLoading(true);
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
                setFiliadoAtual(null); // Nenhum pendente ativo dele
            }
        } catch (err) {
            if (err.code !== 'PGRST116') { // Ignora erro NotFound
                console.error(err);
            }
            setFiliadoAtual(null);
        } finally {
            setLoading(false);
        }
    };

    const handlePegarNovo = async () => {
        setProcessing(true);
        setMessage({ type: '', text: '' });

        try {
            // Pega 1 aleatório livre
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
                setMessage({ type: 'error', text: 'Nenhum contato livre encontrado na fila geral no momento.' });
                setProcessing(false);
                return;
            }

            // Tentativa de lock via RPC Claim Atômica
            const { data: claimsSuccess, error: errorClaim } = await supabase.rpc('claim_filiado', {
                p_filiado_id: livre.id
            });

            if (errorClaim) throw errorClaim;

            if (claimsSuccess) {
                await fetchMeuFiliadoPendente(); // Pega dados agora q é meu
            } else {
                setMessage({ type: 'warning', text: 'Alguém foi mais rápido. Tentando pegar de novo...' });
                // Rekick a function to auto assign next
                setTimeout(handlePegarNovo, 500);
            }

        } catch (err) {
            console.error(err);
            setMessage({ type: 'error', text: 'Erro ao buscar dados.' });
            setProcessing(false);
        }
    };

    const handleFinalizar = async (resultado, erroCodigo = null) => {
        if (!campanhaAtual) {
            setMessage({ type: 'error', text: 'Erro crítico: Sem campanha ativa.' });
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
                setFiliadoAtual(null); // Libera tela pra pegar outro
                setMessage({ type: 'success', text: 'Contato finalizado! Pegue o próximo.' });
            } else {
                setMessage({ type: 'error', text: 'Não foi possível finalizar. Verifique sua conexão.' });
            }
        } catch (err) {
            console.error(err);
            setMessage({ type: 'error', text: 'Erro ao salvar o contato.' });
        } finally {
            setProcessing(false);
        }
    };

    const copiarNumero = () => {
        if (filiadoAtual?.telefone) {
            let fone = filiadoAtual.telefone.replace(/\D/g, '');
            navigator.clipboard.writeText(fone);
            setMessage({ type: 'success', text: 'Número copiado!' });
            setTimeout(() => setMessage({ type: '', text: '' }), 2000);
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
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
            <div className="page-header" style={{ marginBottom: '1rem', textAlign: 'center' }}>
                <h1 className="page-title">Fila de Envios</h1>
            </div>

            {message.text && (
                <div className={`error-message ${message.type === 'success' ? 'badge-success' : message.type === 'warning' ? 'badge-warning' : ''}`} style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center' }}>
                    {message.text}
                </div>
            )}

            <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>

                {!filiadoAtual ? (
                    <div className="empty-state" style={{ padding: '2rem 1rem' }}>
                        <Search size={48} style={{ marginBottom: '1rem' }} />
                        <h3 style={{ fontSize: '1.2rem', marginBottom: '1rem', color: 'white' }}>Você está livre.</h3>
                        <button
                            className="btn-primary"
                            style={{ fontSize: '1.1rem', padding: '1rem' }}
                            onClick={handlePegarNovo}
                            disabled={processing}
                        >
                            {processing ? <Loader2 className="animate-spin" /> : 'PEGAR PRÓXIMO DA FILA BÁSICA'}
                        </button>
                    </div>
                ) : (
                    <div>
                        <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>{filiadoAtual.nome || 'SEM NOME'}</h2>
                        <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
                            {filiadoAtual.municipio_eleitoral} - {filiadoAtual.uf_ddd}
                        </p>

                        <div style={{
                            background: 'rgba(0,0,0,0.2)',
                            padding: '1.5rem',
                            borderRadius: '0.5rem',
                            marginBottom: '2rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '1rem'
                        }}>
                            <span style={{ fontSize: '1.5rem', fontWeight: 'bold', letterSpacing: '2px' }}>
                                {filiadoAtual.telefone || 'SEM NÚMERO'}
                            </span>
                            <button
                                onClick={copiarNumero}
                                className="btn-primary"
                                style={{ width: 'auto', padding: '0.5rem 1rem' }}
                                title="Copiar Número"
                            >
                                <Copy size={20} />
                            </button>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <button
                                className="btn-primary"
                                style={{ background: 'var(--success)', padding: '1.25rem', fontSize: '1.1rem' }}
                                onClick={() => handleFinalizar('sucesso')}
                                disabled={processing}
                            >
                                <CheckCircle size={24} />
                                ENVIADO COM SUCESSO NO WHATSAPP
                            </button>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <button
                                    className="btn-primary"
                                    style={{ background: 'var(--warning)', padding: '1rem' }}
                                    onClick={() => handleFinalizar('erro', 400)}
                                    disabled={processing}
                                >
                                    <AlertTriangle size={20} />
                                    ERRO 400 (Inválido/Sem WPP)
                                </button>
                                <button
                                    className="btn-primary"
                                    style={{ background: 'var(--danger)', padding: '1rem' }}
                                    onClick={() => handleFinalizar('erro', 500)}
                                    disabled={processing}
                                >
                                    <XCircle size={20} />
                                    ERRO 500 (Temperário)
                                </button>
                            </div>
                        </div>

                    </div>
                )}

            </div>
        </div>
    );
}
