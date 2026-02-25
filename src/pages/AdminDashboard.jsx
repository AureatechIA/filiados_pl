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
    const [userPerformance, setUserPerformance] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchMetrics();
        const interval = setInterval(fetchMetrics, 30000);
        return () => clearInterval(interval);
    }, []);

    const fetchMetrics = async () => {
        try {
            // 1. Fetch Global Summary Metrics
            const { data: envios, error: enviosError } = await supabase
                .from('followup_envios')
                .select('status, erro');

            if (enviosError) throw enviosError;

            const summary = (envios || []).reduce((acc, curr) => {
                acc.total++;
                if (curr.status === 'enviado') acc.sucesso++;
                else if (curr.status === 'pendente') acc.pendente++;

                if (curr.erro?.includes('400')) acc.erro400++;
                else if (curr.erro?.includes('500')) acc.erro500++;

                return acc;
            }, { total: 0, sucesso: 0, erro400: 0, erro500: 0, pendente: 0 });

            setMetrics(summary);

            // 2. Fetch User Performance
            // We need to join followup_envios with filiados to get the operator (portal_user_id)
            const { data: rawPerf, error: perfError } = await supabase
                .from('followup_envios')
                .select(`
                    status,
                    erro,
                    filiados (
                        portal_user_id,
                        portal_users (
                            nome
                        )
                    )
                `);

            if (perfError) throw perfError;

            const perfMap = {};

            (rawPerf || []).forEach(item => {
                const operator = item.filiados?.portal_users?.nome || 'Sistema/N8N';
                const operatorId = item.filiados?.portal_user_id || 'system';

                if (!perfMap[operatorId]) {
                    perfMap[operatorId] = { nome: operator, total: 0, sucesso: 0, erro: 0 };
                }

                perfMap[operatorId].total++;
                if (item.status === 'enviado') {
                    perfMap[operatorId].sucesso++;
                } else if (item.status === 'falha') {
                    perfMap[operatorId].erro++;
                }
            });

            const performanceList = Object.values(perfMap).map(u => ({
                ...u,
                conversao: u.total > 0 ? Math.round((u.sucesso / u.total) * 100) : 0
            })).sort((a, b) => b.total - a.total);

            setUserPerformance(performanceList);

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

    if (!user) return null;

    return (
        <div>
            <div className="page-header" style={{ marginBottom: '2rem' }}>
                <h1 className="page-title">Métricas da Operação Manual</h1>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                    Monitoramento em tempo real dos despachos manuais feitos via WhatsApp.
                </p>
            </div>

            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '1.5rem',
                marginBottom: '2rem'
            }}>

                <div className="card" style={{ padding: '1.5rem', borderLeft: '4px solid var(--primary)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3 style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Total Tentativas</h3>
                        <TrendingUp size={20} style={{ color: 'var(--primary)' }} />
                    </div>
                    <p style={{ fontSize: '2rem', fontWeight: 'bold', marginTop: '0.5rem' }}>
                        {metrics.total}
                    </p>
                </div>

                <div className="card" style={{ padding: '1.5rem', borderLeft: '4px solid var(--success)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3 style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Sucessos</h3>
                        <CheckCircle size={20} style={{ color: 'var(--success)' }} />
                    </div>
                    <p style={{ fontSize: '2rem', fontWeight: 'bold', marginTop: '0.5rem' }}>
                        {metrics.sucesso}
                    </p>
                </div>

                <div className="card" style={{ padding: '1.5rem', borderLeft: '4px solid var(--warning)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3 style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Erros 400</h3>
                        <AlertTriangle size={20} style={{ color: 'var(--warning)' }} />
                    </div>
                    <p style={{ fontSize: '2rem', fontWeight: 'bold', marginTop: '0.5rem' }}>
                        {metrics.erro400}
                    </p>
                </div>

                <div className="card" style={{ padding: '1.5rem', borderLeft: '4px solid var(--danger)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3 style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Erros 500</h3>
                        <XCircle size={20} style={{ color: 'var(--danger)' }} />
                    </div>
                    <p style={{ fontSize: '2rem', fontWeight: 'bold', marginTop: '0.5rem' }}>
                        {metrics.erro500}
                    </p>
                </div>

            </div>

            <div className="card" style={{ padding: '2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <h2 style={{ fontSize: '1.25rem', margin: 0 }}>📊 Performance do Usuário</h2>
                </div>

                <div className="table-container">
                    <table style={{ width: '100%' }}>
                        <thead>
                            <tr>
                                <th style={{ textAlign: 'left' }}>Usuário</th>
                                <th>Total</th>
                                <th>Sucesso</th>
                                <th>Erro</th>
                                <th>Conversão</th>
                            </tr>
                        </thead>
                        <tbody>
                            {userPerformance.length === 0 ? (
                                <tr>
                                    <td colSpan="5" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                                        Nenhum dado de envio registrado ainda.
                                    </td>
                                </tr>
                            ) : (
                                userPerformance.map((u, i) => (
                                    <tr key={i}>
                                        <td style={{ textAlign: 'left', fontWeight: 'bold' }}>{u.nome}</td>
                                        <td>{u.total}</td>
                                        <td className="text-success">{u.sucesso}</td>
                                        <td className="text-danger">{u.erro}</td>
                                        <td>{u.conversao}%</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>

    );
}
