import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Loader2, TrendingUp, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';

export default function AdminDashboard() {
    const { user } = useAuth();
    const [metrics, setMetrics] = useState({
        total: 0,
        sucesso: 0,
        erro400: 0,
        erro500: 0,
        pendente: 0
    });

    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchMetrics();

        // Auto-refresh a cada 30 segundos (opcional, bom para dash de campanha)
        const interval = setInterval(fetchMetrics, 30000);
        return () => clearInterval(interval);
    }, []);

    const fetchMetrics = async () => {
        try {
            // Como o painel precisa olhar de 'followup_envios', filtramos os dados agregados.
            // Em projetos escaláveis reais com milhões de rows isso requereria RPC, 
            // mas usaremos count nativo da API REST do Supabase.

            const fetchCount = async (filters) => {
                let req = supabase.from('followup_envios').select('*', { count: 'exact', head: true });
                for (const [key, val] of Object.entries(filters)) {
                    if (val === 'erro400') {
                        req = req.eq('erro', 'Erro 400');
                    } else if (val === 'erro500') {
                        req = req.eq('erro', 'Erro 500');
                    } else {
                        req = req.eq(key, val);
                    }
                }
                const { count, error } = await req;
                if (error) console.warn(error);
                return count || 0;
            };

            const [total, sucesso, e400, e500, pendentes] = await Promise.all([
                fetchCount({}), // Total tentatives
                fetchCount({ status: 'enviado' }), // Sucessos
                fetchCount({ erro_tipo: 'erro400' }), // Custom string filters
                fetchCount({ erro_tipo: 'erro500' }),
                fetchCount({ status: 'pendente' }),
            ]);

            setMetrics({
                total,
                sucesso,
                erro400: e400,
                erro500: e500,
                pendente: pendentes
            });

        } catch (err) {
            console.error("Erro ao puxar metricas", err);
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

    // Full strict fallback per instruction: block render without session/user
    if (!user) return null;

    return (
        <div>
            <div className="page-header" style={{ marginBottom: '2rem' }}>
                <h1 className="page-title">Métricas da Operação Manual</h1>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                    Monitoramento em tempo real dos despachos manuais feitos via WhatsApp. Apenas leitura.
                </p>
            </div>

            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '1.5rem',
                marginBottom: '2rem'
            }}>

                {/* Total Card */}
                <div className="card" style={{ padding: '1.5rem', borderLeft: '4px solid var(--primary)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3 style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Total Tentativas</h3>
                        <TrendingUp size={20} style={{ color: 'var(--primary)' }} />
                    </div>
                    <p style={{ fontSize: '2rem', fontWeight: 'bold', marginTop: '0.5rem' }}>
                        {metrics.total}
                    </p>
                </div>

                {/* Success Card */}
                <div className="card" style={{ padding: '1.5rem', borderLeft: '4px solid var(--success)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3 style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Sucessos</h3>
                        <CheckCircle size={20} style={{ color: 'var(--success)' }} />
                    </div>
                    <p style={{ fontSize: '2rem', fontWeight: 'bold', marginTop: '0.5rem' }}>
                        {metrics.sucesso}
                    </p>
                </div>

                {/* Pendentes */}
                <div className="card" style={{ padding: '1.5rem', borderLeft: '4px solid var(--text-muted)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3 style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Pendentes Finalização</h3>
                        <Loader2 size={20} style={{ color: 'var(--text-muted)' }} />
                    </div>
                    <p style={{ fontSize: '2rem', fontWeight: 'bold', marginTop: '0.5rem' }}>
                        {metrics.pendente}
                    </p>
                </div>

                {/* Error 400 Card */}
                <div className="card" style={{ padding: '1.5rem', borderLeft: '4px solid var(--warning)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3 style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Erros 400 (Inválido)</h3>
                        <AlertTriangle size={20} style={{ color: 'var(--warning)' }} />
                    </div>
                    <p style={{ fontSize: '2rem', fontWeight: 'bold', marginTop: '0.5rem' }}>
                        {metrics.erro400}
                    </p>
                </div>

                {/* Error 500 Card */}
                <div className="card" style={{ padding: '1.5rem', borderLeft: '4px solid var(--danger)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3 style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Erros 500 (Temporário)</h3>
                        <XCircle size={20} style={{ color: 'var(--danger)' }} />
                    </div>
                    <p style={{ fontSize: '2rem', fontWeight: 'bold', marginTop: '0.5rem' }}>
                        {metrics.erro500}
                    </p>
                </div>

            </div>

            {/* PERFORMANCE DO USUÁRIO */}
            <div className="card" style={{ padding: '2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <h2 style={{ fontSize: '1.25rem', margin: 0 }}>📊 Performance do Usuário</h2>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <select className="btn" style={{ padding: '0.25rem 0.5rem', background: 'var(--bg-lighter)', color: 'white', border: '1px solid var(--border)', fontSize: '0.8rem' }}>
                            <option>Hoje</option>
                            <option>Esta Semana</option>
                            <option>Este Mês</option>
                        </select>
                    </div>
                </div>

                <div className="table-container">
                    <table style={{ width: '100%' }}>
                        <thead>
                            <tr>
                                <th style={{ textAlign: 'left' }}>Usuário</th>
                                <th>Total</th>
                                <th>Sucesso (OK)</th>
                                <th>Erro (400/500)</th>
                                <th>Conversão</th>
                            </tr>
                        </thead>
                        <tbody>
                            {/* Dados mockados estruturados conforme pedido para Dashboard Admin */}
                            <tr>
                                <td style={{ textAlign: 'left', fontWeight: 'bold' }}>Operador Alpha (Demonstração)</td>
                                <td>150</td>
                                <td className="text-success">120</td>
                                <td className="text-danger">30</td>
                                <td>80%</td>
                            </tr>
                            <tr>
                                <td style={{ textAlign: 'left', fontWeight: 'bold' }}>Operador Beta (Demonstração)</td>
                                <td>200</td>
                                <td className="text-success">180</td>
                                <td className="text-danger">20</td>
                                <td>90%</td>
                            </tr>
                            <tr>
                                <td style={{ textAlign: 'left', fontWeight: 'bold' }}>Operador Gamma (Demonstração)</td>
                                <td>80</td>
                                <td className="text-success">40</td>
                                <td className="text-danger">40</td>
                                <td>50%</td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <p style={{ marginTop: '1.5rem', fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                    * Dados comparativos entre usuários ativos no período selecionado.
                </p>
            </div>
        </div>
    );
}
