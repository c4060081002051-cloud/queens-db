import { useEffect, useMemo, useState } from "react";
import { type DashboardPayload } from "../api/dashboard";
import { fetchFinanceDashboard } from "../api/financeDashboard";
import { fetchMessages, type InboxMessageApiItem } from "../api/inbox";
import { type FinanceDashboardPayload } from "../components/finance/shared/financeTypes";
import { formatCurrencyUGX } from "../components/finance/shared/financeFormat";
import { EventScheduleCard, StatCard } from "./OverviewShared";

function TreasuryFlowChart({ transactions, net }: { transactions: FinanceDashboardPayload["recentTransactions"]; net: number }) {
  const { earningsSeries, expenditureSeries, earningsTotal, expenditureTotal } = useMemo(() => {
    const ordered = [...transactions].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    );

    const earnings: number[] = [0];
    const expenditures: number[] = [0];
    let runningEarnings = 0;
    let runningExpenditure = 0;

    for (const item of ordered) {
      if (item.type === "income") {
        runningEarnings += item.amount;
      } else {
        runningExpenditure += item.amount;
      }
      earnings.push(runningEarnings);
      expenditures.push(runningExpenditure);
    }

    if (earnings.length < 2) {
      earnings.push(0, 0, 0, 0);
      expenditures.push(0, 0, 0, 0);
    }

    return {
      earningsSeries: earnings,
      expenditureSeries: expenditures,
      earningsTotal: runningEarnings,
      expenditureTotal: runningExpenditure,
    };
  }, [transactions]);

  const max = Math.max(...earningsSeries, ...expenditureSeries, 1) * 1.1;
  const min = 0;
  const range = max - min || 1;
  const width = 800;
  const height = 240;

  const stepX = width / Math.max(earningsSeries.length - 1, 1);
  const earningsCoords = earningsSeries.map((val, i) => [
    i * stepX,
    height - ((val - min) / range) * height,
  ]);
  const expenditureCoords = expenditureSeries.map((val, i) => [
    i * stepX,
    height - ((val - min) / range) * height,
  ]);

  const earningsLinePath = earningsCoords
    .map(([x, y], i) => `${i === 0 ? "M" : "L"} ${x} ${y}`)
    .join(" ");
  const expenditureLinePath = expenditureCoords
    .map(([x, y], i) => `${i === 0 ? "M" : "L"} ${x} ${y}`)
    .join(" ");
  const earningsAreaPath = `${earningsLinePath} L ${width} ${height} L 0 ${height} Z`;
  const expenditureAreaPath = `${expenditureLinePath} L ${width} ${height} L 0 ${height} Z`;

  const netDelta = earningsTotal - expenditureTotal;
  const isUp = netDelta >= 0;
  const trendPct = Math.abs((netDelta / Math.max(earningsTotal, 1)) * 100);

  return (
    <section className="neo-card flex h-full flex-col p-4 sm:p-5">
      <div className="flex justify-between items-start mb-2">
        <div>
          <h2 className="border-b border-[#ebe4d9] pb-2 text-sm font-semibold text-[#2d3436]">Treasury Flow</h2>
          <p className="mt-2 text-2xl font-black text-[#2d3436] tracking-tight">{formatCurrencyUGX(net)}</p>
          <div className="mt-2 flex flex-wrap gap-2 text-[10px] font-bold uppercase tracking-wide">
            <span className="rounded-full bg-[#e8f4e9] px-2.5 py-1 text-[#3d7a46]">
              Earnings: {formatCurrencyUGX(earningsTotal)}
            </span>
            <span className="rounded-full bg-[#fce8e5] px-2.5 py-1 text-[#b4463d]">
              Expenditures: {formatCurrencyUGX(expenditureTotal)}
            </span>
          </div>
        </div>
        <div className={`text-xs font-bold ${isUp ? "text-[#6a9570]" : "text-[#e67e22]"}`}>
          {isUp ? "▲+" : "▼-"}
          {trendPct.toFixed(1)}%
        </div>
      </div>

      <div className="neo-inset-field mt-4 flex min-h-[160px] flex-1 items-end justify-center rounded-2xl p-4 overflow-hidden relative">
        <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="w-full h-[180px] mt-auto">
          <defs>
            <linearGradient id="earnings-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#6a9570" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#6a9570" stopOpacity="0.02" />
            </linearGradient>
            <linearGradient id="expenses-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#e67e22" stopOpacity="0.18" />
              <stop offset="100%" stopColor="#e67e22" stopOpacity="0.02" />
            </linearGradient>
          </defs>
          <path d={earningsAreaPath} fill="url(#earnings-fill)" />
          <path d={expenditureAreaPath} fill="url(#expenses-fill)" />
          <path
            d={earningsLinePath}
            fill="none"
            stroke="#6a9570"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="drop-shadow-[0_4px_4px_rgba(0,0,0,0.05)] transition-all duration-300"
          />
          <path
            d={expenditureLinePath}
            fill="none"
            stroke="#e67e22"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="drop-shadow-[0_4px_4px_rgba(0,0,0,0.05)] transition-all duration-300"
          />
          {earningsCoords.map(([x, y], i) => (
            <circle key={`e-${i}`} cx={x} cy={y} r="3.5" fill="#faf7f0" stroke="#6a9570" strokeWidth="2" />
          ))}
          {expenditureCoords.map(([x, y], i) => (
            <circle key={`x-${i}`} cx={x} cy={y} r="3.5" fill="#faf7f0" stroke="#e67e22" strokeWidth="2" />
          ))}
        </svg>
      </div>
    </section>
  );
}

export function AdminOverview({ dash, loading }: { dash: DashboardPayload | null, loading: boolean }) {
  const [fin, setFin] = useState<FinanceDashboardPayload | null>(null);
  const [messages, setMessages] = useState<InboxMessageApiItem[]>([]);
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    fetchFinanceDashboard().then(setFin).catch(console.error);
    fetchMessages().then(setMessages).catch(console.error);
  }, []);

  if (loading && !dash) {
    return (
      <div className="p-8 text-center animate-pulse text-[#636e72] font-semibold">Loading Admin's Dashboard...</div>
    );
  }

  const s = dash?.stats;
  const today = fin?.today;
  const recentTransactions = fin?.recentTransactions ?? [];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">

      {/* Header Area */}
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[#ebe4d9]/80 pb-6">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-[#2d3436]">
            Admin's Dashboard
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-[#636e72]">
            Administrator's Oversight Terminal
          </p>
        </div>

        <div className="flex shadow-[inset_2px_2px_6px_rgba(0,0,0,0.06),2px_2px_6px_rgba(255,255,255,0.85)] items-center gap-3 bg-gradient-to-br from-[#faf7f0] to-[#ebe4d9] rounded-xl px-5 py-3 border border-[#ebe4d9]">
          <div className="w-2.5 h-2.5 rounded-full bg-[#6a9570] animate-pulse shadow-[0_0_8px_rgba(106,149,112,0.8)]"></div>
          <div className="font-mono flex divide-x divide-[#ebe4d9]">
            <span className="text-[#3b5998] font-bold tracking-widest pr-3 text-sm">
              {time.toLocaleTimeString('en-US', { hour12: false })}
            </span>
            <span className="text-[#636e72] font-bold tracking-wider pl-3 text-sm">
              {time.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase()}
            </span>
          </div>
        </div>
      </header>

      {/* Primary KPI Row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Students"
          value={String(s?.totalStudents ?? "—")}
          className="bg-gradient-to-br from-[#e8f2fa] via-[#d4e8f5] to-[#c5dff0]"
          iconTint="bg-white/40 text-[#2d3436]"
          icon={<span className="text-xl">🎓</span>}
        />
        <StatCard
          title="Total Staff"
          value={String(s?.totalTeachers ?? "—")}
          className="bg-gradient-to-br from-[#e8f4e9] via-[#d4ead6] to-[#c5e3c8]"
          iconTint="bg-white/40 text-[#2d3436]"
          icon={<span className="text-xl">👨‍🏫</span>}
        />
        <StatCard
          title="Today's Income"
          value={formatCurrencyUGX(today?.feesReceived ?? 0)}
          className="bg-gradient-to-br from-[#faf7f0] via-[#f3ead8] to-[#ead9b8]"
          iconTint="bg-white/40 text-[#2d3436]"
          icon={<span className="text-xl">💰</span>}
        />
        <StatCard
          title="Today's Expenses"
          value={formatCurrencyUGX(today?.expenses ?? 0)}
          className="bg-gradient-to-br from-[#fce8e5] via-[#f7d1cd] to-[#efd5d2]"
          iconTint="bg-white/40 text-[#2d3436]"
          icon={<span className="text-xl">🧾</span>}
        />
      </div>

      {/* Main Grid Floor */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left Column: Chart & Messages */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          <TreasuryFlowChart transactions={recentTransactions} net={fin?.month?.net ?? 0} />

          {/* Notifications Feed */}
          <div className="neo-card p-5 min-h-[250px] flex flex-col flex-1">
            <h3 className="border-b border-[#ebe4d9] pb-2 text-sm font-semibold text-[#2d3436] mb-4 uppercase tracking-wider">
              Chart
            </h3>

            <div className="flex-1 overflow-y-auto pr-2 space-y-3">
              {messages.map((m) => (
                <div key={m.id} className={`p-4 rounded-2xl border transition-all ${m.read ? "bg-white/40 border-[#ebe4d9]/80" : "bg-gradient-to-br from-[#e8f2fa] to-[#d4e8f5] shadow-sm border-[#c5dff0] relative"}`}>
                  {!m.read && <div className="absolute -left-1.5 top-1/2 -translate-y-1/2 w-3 h-3 bg-[#5a8faf] rounded-full animate-pulse shadow-[0_0_8px_rgba(90,143,175,0.8)]"></div>}
                  <div className="flex justify-between items-start mb-1 gap-2">
                    <h4 className={`text-sm font-bold ${m.read ? "text-[#636e72]" : "text-[#2d3436]"}`}>{m.title}</h4>
                    <span className="text-[10px] text-[#636e72] font-mono tracking-wider whitespace-nowrap">{new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <p className="text-xs text-[#636e72] leading-relaxed">{m.body}</p>
                </div>
              ))}
              {messages.length === 0 && (
                <div className="h-full flex items-center justify-center text-[#636e72] italic text-sm py-10">
                  No active secured messages.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Ledger Summary & Calendar */}
        <div className="flex flex-col gap-6">

          {/* Daily Ledger Status */}
          <div className="neo-card p-5 bg-gradient-to-br from-[#faf7f0] to-[#f5f0e6]">
            <h3 className="border-b border-[#ebe4d9] pb-2 text-sm font-semibold text-[#2d3436] mb-4 uppercase tracking-wider flex items-center gap-2">
              <svg className="w-4 h-4 text-[#6a9570]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              Ledger View
            </h3>

            <div className="space-y-4">
              <div className="flex justify-between items-end border-b border-[#ebe4d9]/50 pb-3">
                <span className="text-xs font-bold tracking-widest text-[#636e72] uppercase">Closing Net</span>
                <span className={`text-xl font-black ${today && today.net >= 0 ? "text-[#6a9570]" : "text-[#d9534f]"}`}>
                  {formatCurrencyUGX(today?.net ?? 0)}
                </span>
              </div>

              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-[#636e72] block mb-2">Vault Status</span>
                {today?.reportStatus === "verified_and_banked" ? (
                  <div className="bg-gradient-to-br from-[#e8f4e9] to-[#c5e3c8] text-[#2d3436] text-xs font-bold px-3 py-2 rounded-xl border border-[#c5e3c8] shadow-sm flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#6a9570] shadow-[0_0_5px_currentColor]"></span> BANKED & SECURED
                  </div>
                ) : today?.reportStatus === "submitted_for_verification" ? (
                  <div className="bg-gradient-to-br from-[#e8f2fa] to-[#c5dff0] text-[#2d3436] text-xs font-bold px-3 py-2 rounded-xl border border-[#c5dff0] shadow-sm flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#5a8faf] shadow-[0_0_5px_currentColor]"></span> AWAITING ADMIN REVIEW
                  </div>
                ) : (
                  <div className="bg-gradient-to-br from-[#faf7f0] to-[#ead9b8] text-[#2d3436] text-xs font-bold px-3 py-2 rounded-xl border border-[#ead9b8] shadow-sm flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#e67e22] shadow-[0_0_5px_currentColor]"></span> UNRESOLVED OPEN BALANCE
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex-1 min-h-[280px]">
            <EventScheduleCard calendar={dash?.calendar ?? null} />
          </div>
        </div>

      </div>
    </div>
  );
}
