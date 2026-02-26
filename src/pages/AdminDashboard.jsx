import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import {
    Loader2, TrendingUp, AlertTriangle, CheckCircle, XCircle,
    Calendar, Users, BarChart3, PieChart as PieChartIcon, Activity
} from 'lucide-react';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, BarChart, Bar, Legend, Cell
} from 'recharts';

export default function AdminDashboard() {
    const { user } = useAuth();
    const [timeRange, setTimeRange] = useState(7); // 0 = Hoje, 7 = Semana, 30 = Mês
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const [metrics, setMetrics] = useState({
        summary: { total: 0, sucesso: 0, erro400: 0, erro500: 0 },
        chartData: [],
        userData: []
    });

    useEffect(() => {
        fetchMetrics();
        const interval = setInterval(() => fetchMetrics(true), 60000);
        return () => clearInterval(interval);
    }, [timeRange]);

    const fetchMetrics = async (isSilent = false) => {
        if (!isSilent) setLoading(true);
        else setRefreshing(true);

        try {
            // Chamada ao RPC get_dashboard_metrics passando o período em dias
            const { data, error } = await supabase.rpc('get_dashboard_metrics', {
                p_days: timeRange
            });

            if (error) throw error;

            if (data) {
                setMetrics({
                    summary: data.summary || { total: 0, sucesso: 0, erro400: 0, erro500: 0 },
                    chartData: data.chart_data || [],
                    userData: data.user_data || []
                });
            }
        } catch (err) {
            console.error("Erro ao puxar metricas via RPC", err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    if (loading) {
        return (
            <div className="loader-container">
                <Loader2 className="spinner" />
                <p style={{ marginTop: '1rem', color: 'var(--text-muted)' }}>Processando dados em tempo real...</p>
            </div>
        );
    }

    if (!user) return null;

    const conversionRate = metrics.summary.total > 0
        ? Math.round((metrics.summary.sucesso / metrics.summary.total) * 100)
        : 0;

    return (
        <div style={{ paddingBottom: '3rem' }}>
            <div className="page-header" style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <div>
                    <h1 className="page-title">Analytics da Operação</h1>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                        Métricas consolidadas de envios manuais via WhatsApp.
                    </p>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', background: 'var(--bg-lighter)', padding: '0.25rem', borderRadius: '8px', border: '1px solid var(--border)' }}>
                    {[
                        { label: 'Hoje', value: 0 },
                        { label: '7D', value: 7 },
                        { label: '30D', value: 30 }
                    ].map(btn => (
                        <button
                            key={btn.value}
                            onClick={() => setTimeRange(btn.value)}
                            style={{
                                padding: '0.5rem 1rem',
                                borderRadius: '6px',
                                border: 'none',
                                background: timeRange === btn.value ? 'var(--primary)' : 'transparent',
                                color: timeRange === btn.value ? 'white' : 'var(--text-muted)',
                                cursor: 'pointer',
                                fontSize: '0.875rem',
                                fontWeight: 'bold',
                                transition: 'all 0.2s'
                            }}
                        >
                            {btn.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* QUICK STATS */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '1.5rem',
                marginBottom: '2rem'
            }}>
                <StatCard title="Total Tentativas" value={metrics.summary.total} icon={<Activity size={20} />} color="var(--primary)" />
                <StatCard title="Sucessos" value={metrics.summary.sucesso} icon={<CheckCircle size={20} />} color="var(--success)" />
                <StatCard title="Taxa de Conversão" value={`${conversionRate}%`} icon={<TrendingUp size={20} />} color="#a855f7" />
                <StatCard title="Erros Totais" value={metrics.summary.erro400 + metrics.summary.erro500} icon={<AlertTriangle size={20} />} color="var(--danger)" />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
                {/* VOLUME CHART */}
                <div className="card" style={{ padding: '2rem', minHeight: '400px' }}>
                    <h3 style={{ fontSize: '1.1rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <BarChart3 size={18} className="text-primary" /> Volume de Envios Diários
                    </h3>
                    <div style={{ width: '100%', height: '300px', position: 'relative' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={metrics.chartData}>

                                <defs>
                                    <linearGradient id="colorVolume" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                                <XAxis dataKey="data_format" stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
                                <YAxis stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
                                <Tooltip
                                    contentStyle={{ background: 'var(--bg-lighter)', border: '1px solid var(--border)', borderRadius: '8px' }}
                                    itemStyle={{ color: 'white' }}
                                />
                                <Area type="monotone" dataKey="volume" stroke="var(--primary)" strokeWidth={3} fillOpacity={1} fill="url(#colorVolume)" />
                                <Area type="monotone" dataKey="sucessos" stroke="var(--success)" strokeWidth={2} fill="transparent" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* DISTRIBUTION / ERROR INFO */}
                <div className="card" style={{ padding: '2rem' }}>
                    <h3 style={{ fontSize: '1.1rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <PieChartIcon size={18} className="text-primary" /> Distribuição de Erros
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', justifyContent: 'center', height: '80%' }}>
                        <ErrorItem label="Dados Inválidos (400)" value={metrics.summary.erro400} total={metrics.summary.total} color="var(--warning)" />
                        <ErrorItem label="Erro Servidor (500)" value={metrics.summary.erro500} total={metrics.summary.total} color="var(--danger)" />
                        <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
                            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                Erros 400 geralmente indicam números sem WhatsApp ou bloqueados.
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* PERFORMANCE TABLE */}
            <div className="card" style={{ padding: '2rem' }}>
                <h3 style={{ fontSize: '1.1rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Users size={18} className="text-primary" /> Performance por Operador
                </h3>

                <div className="table-container">
                    <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 8px' }}>
                        <thead>
                            <tr style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                                <th style={{ textAlign: 'left', padding: '0 1rem' }}>OPERADOR</th>
                                <th>VOLUME</th>
                                <th>SUCESSOS</th>
                                <th>ERROS</th>
                                <th>CONVERSÃO</th>
                            </tr>
                        </thead>
                        <tbody>
                            {metrics.userData.length === 0 ? (
                                <tr>
                                    <td colSpan="5" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                                        Nenhuma atividade registrada no período selecionado.
                                    </td>
                                </tr>
                            ) : (
                                metrics.userData.map((op, idx) => {
                                    const conv = op.total > 0 ? Math.round((op.sucesso / op.total) * 100) : 0;
                                    return (
                                        <tr key={idx} style={{ background: 'rgba(255,255,255,0.02)', borderRadius: '8px' }}>
                                            <td style={{ textAlign: 'left', padding: '1rem', fontWeight: 'bold' }}>{op.nome}</td>
                                            <td>{op.total}</td>
                                            <td className="text-success">{op.sucesso}</td>
                                            <td className="text-danger">{op.erro}</td>
                                            <td>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
                                                    <div style={{ width: '60px', height: '6px', background: 'var(--border)', borderRadius: '3px', overflow: 'hidden' }}>
                                                        <div style={{ width: `${conv}%`, height: '100%', background: conv > 70 ? 'var(--success)' : conv > 40 ? 'var(--warning)' : 'var(--danger)' }} />
                                                    </div>
                                                    <span style={{ fontWeight: 'bold', minWidth: '35px' }}>{conv}%</span>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {refreshing && (
                <div style={{ position: 'fixed', bottom: '2rem', right: '2rem', background: 'var(--primary)', padding: '0.5rem 1rem', borderRadius: '20px', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.5)', zIndex: 100 }}>
                    <Loader2 size={14} className="spinner" />
                    <span style={{ fontSize: '0.75rem', fontWeight: 'bold' }}>Atualizando...</span>
                </div>
            )}
        </div>
    );
}

function StatCard({ title, value, icon, color }) {
    return (
        <div className="card" style={{ padding: '1.5rem', borderLeft: `4px solid ${color}`, position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', right: '-10px', top: '-10px', opacity: 0.05, color }}>
                {React.cloneElement(icon, { size: 80 })}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative' }}>
                <h3 style={{ fontSize: '0.875rem', color: 'var(--text-muted)', margin: 0 }}>{title}</h3>
                <div style={{ color }}>{icon}</div>
            </div>
            <p style={{ fontSize: '2rem', fontWeight: 'bold', marginTop: '0.5rem', margin: '0.5rem 0 0 0', position: 'relative' }}>
                {value}
            </p>
        </div>
    );
}

function ErrorItem({ label, value, total, color }) {
    const pct = total > 0 ? Math.round((value / total) * 100) : 0;
    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.85rem' }}>
                <span>{label}</span>
                <span style={{ fontWeight: 'bold' }}>{value} <small style={{ color: 'var(--text-muted)' }}>({pct}%)</small></span>
            </div>
            <div style={{ width: '100%', height: '8px', background: 'var(--border)', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ width: `${pct}%`, height: '100%', background: color }} />
            </div>
        </div>
    );
}
