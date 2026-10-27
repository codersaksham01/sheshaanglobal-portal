'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import dynamic from 'next/dynamic';
import {
  TrendingUp,
  TrendingDown,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  Plus,
  Download,
  Eye,
  FileText,
  Filter,
  Search,
  Lock,
  Smartphone,
  RefreshCw,
  Building,
  ArrowUpRight,
  ArrowDownLeft,
  ChevronRight,
  Check,
  X,
  Calendar,
  Wallet,
  Receipt,
  Share2,
  CreditCard,
  Building2,
  CheckSquare,
  Sparkles,
  RotateCcw,
  SlidersHorizontal,
  ExternalLink,
  Trash2
} from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { getPortalCache, setPortalCache, fetchAllPortalData } from '../../lib/portalDataStore';
import { AccountingRecord, AccountingSummary, ExpenseStatus, TransactionType } from '../../lib/types';
import { AccountingReportPDF } from './AccountingReportPDF';

// Dynamic PDF Viewer for browser-safe rendering
const PDFViewer = dynamic(
  () => import('@react-pdf/renderer').then((mod) => mod.PDFViewer),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full min-h-[400px] flex flex-col items-center justify-center bg-slate-50 text-slate-500 rounded-2xl shadow-xs">
        <RefreshCw className="h-7 w-7 animate-spin text-blue-900 mb-2" />
        <p className="text-xs font-bold text-slate-700">Loading Sheshaan Global Financial Statement PDF...</p>
        <p className="text-[11px] text-slate-400 mt-0.5">Initializing document vector engine</p>
      </div>
    )
  }
);

const TARGET_PHONE = '+91 81499 09546';
const ADMIN_NAME = 'Sana Zeba Bakshi';

const EXPENSE_CATEGORIES = [
  'Packaging Materials',
  'Freight & Logistics',
  'Port & Customs Charges',
  'Warehousing & Storage',
  'Courier & Sample Dispatch',
  'Supplier Advance / Procurement',
  'Office & Administration',
  'Marketing & Export Promotion',
  'Legal & Certification Fees',
  'Utilities & Communication',
  'Other Expense'
];

const INCOME_CATEGORIES = [
  'Export Buyer Advance (CIF/FOB)',
  'Final Wire Remittance vs Shipping Bill',
  'Sample Order Payment',
  'Duty Drawback / RoDTEP Incentive',
  'GST / IGST Refund',
  'Local B2B Sales',
  'Other Inflow'
];

const PAYMENT_METHODS = [
  'Bank Transfer (NEFT/RTGS/IMPS)',
  'Inward Wire Transfer (SWIFT)',
  'UPI / QR Code',
  'Corporate Debit/Credit Card',
  'Cheque / Demand Draft',
  'Letter of Credit (LC)',
  'Petty Cash'
];

// Default initial corporate transactions for instantaneous zero-latency load
const DEFAULT_ACCOUNTING_RECORDS: AccountingRecord[] = [
  {
    id: 'acc-tx-1',
    type: 'income',
    title: 'Advance Payment (50%) for Khor Fakkan Port Order SG-CIF-2026-0001',
    description: '50% advance remittance via TT against Proforma Quotation SG-CIF-2026-0001 for 13 MT Cumin Seeds.',
    category: 'Export Buyer Advance (CIF/FOB)',
    amount: 1680185.0,
    currency: 'INR',
    payment_method: 'Inward Wire Transfer (SWIFT)',
    reference_number: 'TT-SBI-20260810-7741',
    transaction_date: '2026-10-27',
    paid_to_or_from: 'BusyExim Private Limited, UAE',
    logged_by_name: 'Sana Zeba Bakshi',
    logged_by_email: 'info@sheshaanglobal.com',
    status: 'approved',
    approved_by_name: 'Sana Zeba Bakshi',
    approved_by_email: 'info@sheshaanglobal.com',
    approval_date: '2026-10-27T10:00:00Z',
    approval_notes: 'Wire received in SBI export current account and credited with FIRCF advice.',
    requires_otp: false
  },
  {
    id: 'acc-tx-2',
    type: 'expense',
    title: 'Export Jute Packing & Palletization (325 Bags)',
    description: 'Procurement of 40kg food-grade jute bags with inner liner, machine strapping and wooden fumigated pallets.',
    category: 'Packaging Materials',
    amount: 45500.0,
    currency: 'INR',
    payment_method: 'Bank Transfer (NEFT/RTGS/IMPS)',
    reference_number: 'NEFT-5432098812',
    transaction_date: '2026-10-27',
    paid_to_or_from: 'Nagpur Spice Processing Co.',
    logged_by_name: 'Nancy Sharma (Accounts)',
    logged_by_email: 'accounts@sheshaanglobal.com',
    status: 'approved',
    approved_by_name: 'Sana Zeba Bakshi',
    approved_by_email: 'info@sheshaanglobal.com',
    approval_date: '2026-10-27T11:30:00Z',
    approval_notes: 'Authorized by CEO Sana Zeba Bakshi for stuffing at plant warehouse.',
    requires_otp: true,
    otp_verified: true,
    otp_verified_at: '2026-10-27T11:28:00Z'
  },
  {
    id: 'acc-tx-3',
    type: 'expense',
    title: 'Origin Customs Clearance, Shipping Bill & Phytosanitary Dossier',
    description: 'Customs filing, port entry formalities, and Plant Quarantine inspection charges.',
    category: 'Port & Customs Charges',
    amount: 19500.0,
    currency: 'INR',
    payment_method: 'Bank Transfer (NEFT/RTGS/IMPS)',
    reference_number: 'RTGS-982143098',
    transaction_date: '2026-10-27',
    paid_to_or_from: 'Gujarat Coastal Logistics & CHA',
    logged_by_name: 'Operations Desk',
    logged_by_email: 'operations@sheshaanglobal.com',
    status: 'approved',
    approved_by_name: 'Sana Zeba Bakshi',
    approved_by_email: 'info@sheshaanglobal.com',
    approval_date: '2026-10-27T12:00:00Z',
    approval_notes: 'Verified against port gate receipt & quarantine permit.',
    requires_otp: true,
    otp_verified: true,
    otp_verified_at: '2026-10-27T11:58:00Z'
  },
  {
    id: 'acc-tx-4',
    type: 'expense',
    title: 'Cold Storage Holding & Phytosanitary Quarantine Inspection Fee',
    description: 'Moisture calibration, laboratory purity test, and fumigation certificate processing.',
    category: 'Warehousing & Storage',
    amount: 12400.0,
    currency: 'INR',
    payment_method: 'UPI / QR Code',
    reference_number: 'UPI-776655443322',
    transaction_date: '2026-10-27',
    paid_to_or_from: 'Central Warehouse & Agmark Lab',
    logged_by_name: 'Rohan Mehra (Logistics Officer)',
    logged_by_email: 'rohan.mehra@sheshaanglobal.com',
    status: 'pending_approval',
    requires_otp: true,
    otp_verified: true,
    otp_verified_at: '2026-10-27T12:30:00Z'
  },
  {
    id: 'acc-tx-5',
    type: 'expense',
    title: 'Express Document Courier for Embassy Attestation',
    description: 'DHL express courier of Certificate of Origin and Health Certificate to Embassy.',
    category: 'Courier & Sample Dispatch',
    amount: 1450.0,
    currency: 'INR',
    payment_method: 'Petty Cash',
    reference_number: 'VOUCHER-089',
    transaction_date: '2026-10-27',
    paid_to_or_from: 'DHL Express Nagpur Desk',
    logged_by_name: 'Nancy Sharma (Accounts)',
    logged_by_email: 'accounts@sheshaanglobal.com',
    status: 'approved',
    approved_by_name: 'Sana Zeba Bakshi',
    approved_by_email: 'info@sheshaanglobal.com',
    approval_date: '2026-10-27T13:00:00Z',
    approval_notes: 'Routine courier reimbursement approved.',
    requires_otp: false
  }
];

export function AccountingWorkspace() {
  // Pre-seed with cached or default records for instantaneous 0ms display with real values
  const [records, setRecords] = useState<AccountingRecord[]>(() => {
    if (typeof window !== 'undefined') {
      const cache = getPortalCache();
      if (cache?.accountingTransactions && cache.accountingTransactions.length > 0) {
        return cache.accountingTransactions;
      }
    }
    return DEFAULT_ACCOUNTING_RECORDS;
  });

  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'ledger' | 'pending' | 'analytics' | 'report'>('ledger');

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'expense' | 'income'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | ExpenseStatus>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<'all' | 'this_month' | 'last_30_days'>('all');

  // Modal States
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showIncomeModal, setShowIncomeModal] = useState(false);
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [selectedRecordForApproval, setSelectedRecordForApproval] = useState<AccountingRecord | null>(null);
  const [rejectionNotes, setRejectionNotes] = useState('');
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);
  const [recordToDelete, setRecordToDelete] = useState<AccountingRecord | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Expense Form State
  const [expenseForm, setExpenseForm] = useState({
    title: '',
    category: EXPENSE_CATEGORIES[0],
    amount: '',
    payment_method: PAYMENT_METHODS[0],
    paid_to_or_from: '',
    reference_number: '',
    transaction_date: new Date().toISOString().slice(0, 10),
    description: '',
    receipt_url: ''
  });

  // Income Form State
  const [incomeForm, setIncomeForm] = useState({
    title: '',
    category: INCOME_CATEGORIES[0],
    amount: '',
    currency: 'INR' as 'INR' | 'USD',
    payment_method: PAYMENT_METHODS[0],
    paid_to_or_from: '',
    reference_number: '',
    transaction_date: new Date().toISOString().slice(0, 10),
    description: ''
  });

  // OTP State
  const [otpCode, setOtpCode] = useState('');
  const [otpError, setOtpError] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpTimer, setOtpTimer] = useState(60);
  const [demoOtpHint, setDemoOtpHint] = useState<string | null>(null);
  const [whatsappUrl, setWhatsappUrl] = useState<string | null>(null);
  const [pendingExpenseData, setPendingExpenseData] = useState<any>(null);
  const [callmebotDelivered, setCallmebotDelivered] = useState(false);
  const [showGatewayConfig, setShowGatewayConfig] = useState(false);
  const [callmebotApiKey, setCallmebotApiKey] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('portal_callmebot_key') || '';
    }
    return '';
  });

  // PDF Download state
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  // Load Transactions from database
  const loadTransactions = useCallback(async (force = false) => {
    try {
      setLoading(true);
      const cache = getPortalCache();
      if (!force && cache?.accountingTransactions && cache.accountingTransactions.length > 0) {
        setRecords(cache.accountingTransactions);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('accounting_transactions')
        .select('*')
        .order('transaction_date', { ascending: false });

      if (data && !error && data.length > 0) {
        setRecords(data as AccountingRecord[]);
        setPortalCache({ accountingTransactions: data as AccountingRecord[] });
      } else {
        const allData = await fetchAllPortalData({ force: true });
        if (allData.accountingTransactions && allData.accountingTransactions.length > 0) {
          setRecords(allData.accountingTransactions);
        } else {
          setRecords(DEFAULT_ACCOUNTING_RECORDS);
          setPortalCache({ accountingTransactions: DEFAULT_ACCOUNTING_RECORDS });
        }
      }
    } catch (err) {
      console.error('Failed to load accounting transactions:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  // Flash toast auto-dismiss
  useEffect(() => {
    if (actionSuccessMessage) {
      const timer = setTimeout(() => setActionSuccessMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [actionSuccessMessage]);

  // OTP Countdown Timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (showOtpModal && otpTimer > 0) {
      interval = setInterval(() => {
        setOtpTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [showOtpModal, otpTimer]);

  // Computed Summaries
  const summary: AccountingSummary = useMemo(() => {
    let totalIncome = 0;
    let totalExpenses = 0;
    let pendingApprovalsCount = 0;
    let pendingApprovalsAmount = 0;

    const catMap = new Map<string, { total: number; count: number }>();

    for (const r of records) {
      const amt = Number(r.amount || 0);
      if (r.type === 'income') {
        totalIncome += amt;
      } else if (r.type === 'expense') {
        if (r.status === 'approved') {
          totalExpenses += amt;
          const cat = r.category || 'Other Expense';
          const c = catMap.get(cat) || { total: 0, count: 0 };
          c.total += amt;
          c.count += 1;
          catMap.set(cat, c);
        } else if (r.status === 'pending_approval') {
          pendingApprovalsCount += 1;
          pendingApprovalsAmount += amt;
        }
      }
    }

    const categoryBreakdown = Array.from(catMap.entries()).map(([category, val]) => ({
      category,
      total: val.total,
      count: val.count,
      percentage: totalExpenses > 0 ? (val.total / totalExpenses) * 100 : 0
    })).sort((a, b) => b.total - a.total);

    return {
      totalIncome,
      totalExpenses,
      netProfit: totalIncome - totalExpenses,
      pendingApprovalsCount,
      pendingApprovalsAmount,
      categoryBreakdown
    };
  }, [records]);

  // Filtered Records
  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchesTitle = (r.title || '').toLowerCase().includes(q);
        const matchesPayee = (r.paid_to_or_from || '').toLowerCase().includes(q);
        const matchesRef = (r.reference_number || '').toLowerCase().includes(q);
        const matchesCategory = (r.category || '').toLowerCase().includes(q);
        if (!matchesTitle && !matchesPayee && !matchesRef && !matchesCategory) return false;
      }

      if (filterType !== 'all' && r.type !== filterType) return false;
      if (filterStatus !== 'all' && r.status !== filterStatus) return false;
      if (filterCategory !== 'all' && r.category !== filterCategory) return false;

      if (dateFilter === 'this_month') {
        const curMonth = new Date().toISOString().slice(0, 7);
        if (!r.transaction_date.startsWith(curMonth)) return false;
      } else if (dateFilter === 'last_30_days') {
        const d = new Date();
        d.setDate(d.getDate() - 30);
        const cutoff = d.toISOString().slice(0, 10);
        if (r.transaction_date < cutoff) return false;
      }

      return true;
    });
  }, [records, searchTerm, filterType, filterStatus, filterCategory, dateFilter]);

  const hasActiveFilters = Boolean(
    searchTerm.trim() || filterType !== 'all' || filterStatus !== 'all' || filterCategory !== 'all' || dateFilter !== 'all'
  );

  const resetFilters = () => {
    setSearchTerm('');
    setFilterType('all');
    setFilterStatus('all');
    setFilterCategory('all');
    setDateFilter('all');
  };

  // Pending Approvals List
  const pendingApprovalsList = useMemo(() => {
    return records.filter((r) => r.type === 'expense' && r.status === 'pending_approval');
  }, [records]);

  // Handle Initiating Expense Submission
  const handleExpenseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(expenseForm.amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      alert('Please enter a valid positive expense amount.');
      return;
    }

    const payload = {
      id: `acc-tx-${Date.now()}`,
      type: 'expense' as TransactionType,
      title: expenseForm.title.trim(),
      description: expenseForm.description.trim(),
      category: expenseForm.category,
      amount: numAmount,
      currency: 'INR' as const,
      payment_method: expenseForm.payment_method,
      reference_number: expenseForm.reference_number.trim(),
      transaction_date: expenseForm.transaction_date,
      paid_to_or_from: expenseForm.paid_to_or_from.trim(),
      logged_by_name: 'Accounts Desk',
      logged_by_email: 'accounts@sheshaanglobal.com',
      status: 'pending_approval' as ExpenseStatus,
      requires_otp: numAmount > 2000,
      receipt_url: expenseForm.receipt_url.trim(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    if (numAmount > 2000) {
      setPendingExpenseData(payload);
      setOtpLoading(true);
      setShowOtpModal(true);
      setOtpError('');
      setOtpCode('');
      setOtpTimer(60);

      try {
        const res = await fetch('/api/accounting/otp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'send',
            amount: numAmount,
            title: payload.title,
            payee: payload.paid_to_or_from,
            callmebotApiKey: callmebotApiKey.trim() || undefined
          })
        });
        const data = await res.json();
        if (data.success) {
          setDemoOtpHint(data.previewCode || null);
          setWhatsappUrl(data.whatsappUrl || null);
          setCallmebotDelivered(Boolean(data.callmebotDelivered));
        } else {
          setOtpError(data.error || 'Failed to dispatch OTP to mobile number');
        }
      } catch (err: any) {
        setOtpError('Failed to communicate with OTP gateway');
      } finally {
        setOtpLoading(false);
      }
      return;
    }

    await saveExpenseDirectly(payload);
  };

  const saveExpenseDirectly = async (record: AccountingRecord) => {
    try {
      const { data, error } = await supabase
        .from('accounting_transactions')
        .insert([record])
        .select();

      const newRecord = data && data[0] ? data[0] : record;
      const updated = [newRecord, ...records];
      setRecords(updated);
      setPortalCache({ accountingTransactions: updated });

      setShowExpenseModal(false);
      setExpenseForm({
        title: '',
        category: EXPENSE_CATEGORIES[0],
        amount: '',
        payment_method: PAYMENT_METHODS[0],
        paid_to_or_from: '',
        reference_number: '',
        transaction_date: new Date().toISOString().slice(0, 10),
        description: '',
        receipt_url: ''
      });

      setActionSuccessMessage(
        `Expense of ₹${record.amount.toLocaleString('en-IN')} logged successfully. Submitted to CEO Sana Zeba Bakshi for approval.`
      );
    } catch (err) {
      console.error('Failed to save expense:', err);
      alert('Failed to save expense record. Please retry.');
    }
  };

  const handleResendOtp = async () => {
    if (otpTimer > 0 || !pendingExpenseData) return;
    setOtpLoading(true);
    setOtpError('');
    try {
      const res = await fetch('/api/accounting/otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'send',
          amount: pendingExpenseData.amount,
          title: pendingExpenseData.title,
          payee: pendingExpenseData.paid_to_or_from,
          callmebotApiKey: callmebotApiKey.trim() || undefined
        })
      });
      const data = await res.json();
      if (data.success) {
        setDemoOtpHint(data.previewCode || null);
        setWhatsappUrl(data.whatsappUrl || null);
        setCallmebotDelivered(Boolean(data.callmebotDelivered));
        setOtpTimer(60);
      } else {
        setOtpError(data.error || 'Failed to resend OTP');
      }
    } catch {
      setOtpError('Failed to resend OTP code');
    } finally {
      setOtpLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otpCode || otpCode.trim().length !== 6) {
      setOtpError('Please enter the complete 6-digit verification code.');
      return;
    }
    setOtpLoading(true);
    setOtpError('');

    try {
      const res = await fetch('/api/accounting/otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'verify',
          code: otpCode.trim()
        })
      });
      const data = await res.json();

      if (!res.ok || !data.verified) {
        setOtpError(data.error || 'Invalid OTP code. Please check your SMS or WhatsApp and retry.');
        setOtpLoading(false);
        return;
      }

      const finalizedRecord: AccountingRecord = {
        ...pendingExpenseData,
        requires_otp: true,
        otp_verified: true,
        otp_verified_at: new Date().toISOString()
      };

      await saveExpenseDirectly(finalizedRecord);
      setShowOtpModal(false);
      setPendingExpenseData(null);
      setOtpCode('');
      setDemoOtpHint(null);
    } catch (err) {
      setOtpError('Verification failed due to a network error.');
    } finally {
      setOtpLoading(false);
    }
  };

  const handleIncomeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(incomeForm.amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      alert('Please enter a valid positive income amount.');
      return;
    }

    const payload: AccountingRecord = {
      id: `acc-in-${Date.now()}`,
      type: 'income',
      title: incomeForm.title.trim(),
      description: incomeForm.description.trim(),
      category: incomeForm.category,
      amount: numAmount,
      currency: incomeForm.currency,
      payment_method: incomeForm.payment_method,
      reference_number: incomeForm.reference_number.trim(),
      transaction_date: incomeForm.transaction_date,
      paid_to_or_from: incomeForm.paid_to_or_from.trim(),
      logged_by_name: 'Accounts Desk',
      logged_by_email: 'accounts@sheshaanglobal.com',
      status: 'approved',
      approved_by_name: 'Sana Zeba Bakshi',
      approved_by_email: 'info@sheshaanglobal.com',
      approval_date: new Date().toISOString(),
      approval_notes: 'Commercial inward export remittance certified by CEO.',
      requires_otp: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    try {
      const { data, error } = await supabase
        .from('accounting_transactions')
        .insert([payload])
        .select();

      const newRecord = data && data[0] ? data[0] : payload;
      const updated = [newRecord, ...records];
      setRecords(updated);
      setPortalCache({ accountingTransactions: updated });

      setShowIncomeModal(false);
      setIncomeForm({
        title: '',
        category: INCOME_CATEGORIES[0],
        amount: '',
        currency: 'INR',
        payment_method: PAYMENT_METHODS[0],
        paid_to_or_from: '',
        reference_number: '',
        transaction_date: new Date().toISOString().slice(0, 10),
        description: ''
      });

      setActionSuccessMessage(`Income remittance of ₹${numAmount.toLocaleString('en-IN')} logged and certified.`);
    } catch (err) {
      console.error('Failed to log income:', err);
      alert('Failed to log income remittance.');
    }
  };

  const handleApproveExpense = async (record: AccountingRecord) => {
    const now = new Date().toISOString();
    const updatedRecord: AccountingRecord = {
      ...record,
      status: 'approved',
      approved_by_name: 'Sana Zeba Bakshi',
      approved_by_email: 'info@sheshaanglobal.com',
      approval_date: now,
      approval_notes: 'Approved & certified by CEO Sana Zeba Bakshi.'
    };

    try {
      const { error } = await supabase
        .from('accounting_transactions')
        .update({
          status: 'approved',
          approved_by_name: 'Sana Zeba Bakshi',
          approved_by_email: 'info@sheshaanglobal.com',
          approval_date: now,
          approval_notes: 'Approved & certified by CEO Sana Zeba Bakshi.'
        })
        .eq('id', record.id);

      if (!error) {
        const next = records.map((r) => (r.id === record.id ? updatedRecord : r));
        setRecords(next);
        setPortalCache({ accountingTransactions: next });
        setActionSuccessMessage(`Expense "${record.title}" (₹${record.amount.toLocaleString('en-IN')}) officially APPROVED by Sana Zeba Bakshi.`);
      }
    } catch (err) {
      console.error('Failed to approve transaction:', err);
      alert('Failed to approve transaction.');
    }
  };

  const handleRejectExpense = async () => {
    if (!selectedRecordForApproval) return;
    const now = new Date().toISOString();
    const updatedRecord: AccountingRecord = {
      ...selectedRecordForApproval,
      status: 'rejected',
      approved_by_name: 'Sana Zeba Bakshi',
      approved_by_email: 'info@sheshaanglobal.com',
      approval_date: now,
      approval_notes: rejectionNotes.trim() || 'Disbursement rejected by CEO Sana Zeba Bakshi.'
    };

    try {
      const { error } = await supabase
        .from('accounting_transactions')
        .update({
          status: 'rejected',
          approved_by_name: 'Sana Zeba Bakshi',
          approved_by_email: 'info@sheshaanglobal.com',
          approval_date: now,
          approval_notes: rejectionNotes.trim() || 'Disbursement rejected by CEO Sana Zeba Bakshi.'
        })
        .eq('id', selectedRecordForApproval.id);

      if (!error) {
        const next = records.map((r) => (r.id === selectedRecordForApproval.id ? updatedRecord : r));
        setRecords(next);
        setPortalCache({ accountingTransactions: next });
        setShowApprovalModal(false);
        setSelectedRecordForApproval(null);
        setRejectionNotes('');
        setActionSuccessMessage(`Expense "${selectedRecordForApproval.title}" marked as REJECTED.`);
      }
    } catch (err) {
      console.error('Failed to reject transaction:', err);
    }
  };

  const handleDeleteRecord = async () => {
    if (!recordToDelete) return;
    setDeleteLoading(true);
    try {
      const { error } = await supabase
        .from('accounting_transactions')
        .delete()
        .eq('id', recordToDelete.id);

      if (!error) {
        const next = records.filter((r) => r.id !== recordToDelete.id);
        setRecords(next);
        setPortalCache({ accountingTransactions: next });
        const recordType = recordToDelete.type === 'expense' ? 'Expense' : 'Income';
        setActionSuccessMessage(`${recordType} "${recordToDelete.title}" (₹${recordToDelete.amount.toLocaleString('en-IN')}) permanently deleted.`);
        setRecordToDelete(null);
      } else {
        alert('Failed to delete transaction: ' + (error.message || 'Unknown error'));
      }
    } catch (err: any) {
      console.error('Failed to delete transaction:', err);
      alert('Failed to delete transaction.');
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (downloadingPdf) return;
    setDownloadingPdf(true);
    try {
      const { pdf } = await import('@react-pdf/renderer');
      const blob = await pdf(
        <AccountingReportPDF
          records={records}
          summary={summary}
          dateRangeLabel="Financial Statement 2026"
          generatedBy="Accounts & Finance Desk"
          reportRef={`SG-ACCR-${new Date().getFullYear()}-${String(records.length).padStart(4, '0')}`}
        />
      ).toBlob();

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Sheshaan-Global-Financial-Statement-${new Date().toISOString().slice(0, 10)}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to generate PDF:', err);
      alert('Failed to generate Financial Statement PDF. Please retry.');
    } finally {
      setDownloadingPdf(false);
    }
  };

  return (
    <div className="w-full space-y-4 sm:space-y-6 text-slate-800 pb-16">
      {/* Toast Notification with smooth positioning */}
      {actionSuccessMessage && (
        <div className="fixed bottom-4 sm:bottom-6 right-4 sm:right-6 z-50 flex items-center gap-3 bg-slate-900/95 backdrop-blur text-white px-4 py-3 rounded-2xl shadow-2xl text-xs font-semibold max-w-[90vw] sm:max-w-md animate-in slide-in-from-bottom duration-200">
          <Sparkles className="h-4 w-4 text-amber-400 shrink-0" />
          <span className="flex-1 break-words">{actionSuccessMessage}</span>
          <button
            type="button"
            onClick={() => setActionSuccessMessage(null)}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition shrink-0"
            aria-label="Dismiss toast"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* TOP HEADER: Clean Executive Design, Borderless, Natural Full Width */}
      <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1.5 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 text-blue-900 font-bold text-[11px] uppercase tracking-wider">
              <Receipt className="h-3.5 w-3.5 shrink-0" />
              Corporate Finance & Internal Ledger
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 font-semibold text-[11px]">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Active Fiscal Period 2026
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-black text-slate-900 tracking-tight break-words">
            Internal Accounting & Expense Management
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 leading-relaxed max-w-3xl">
            Real-time operating general ledger, mandatory CEO authorization workflows, and print-ready corporate financial statements matching Sheshaan Global quotations.
          </p>
        </div>

        {/* Action Buttons: Neatly Aligned, Borderless & Scalable */}
        <div className="flex items-stretch sm:items-center gap-2 sm:gap-2.5 flex-wrap sm:flex-nowrap shrink-0">
          <button
            type="button"
            onClick={handleDownloadPDF}
            disabled={downloadingPdf}
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-800 text-xs font-bold shadow-xs transition active:scale-95 disabled:opacity-50"
            title="Generate Sheshaan Global Financial Statement PDF"
          >
            {downloadingPdf ? (
              <RefreshCw className="h-4 w-4 animate-spin text-blue-900 shrink-0" />
            ) : (
              <Download className="h-4 w-4 text-blue-900 shrink-0" />
            )}
            <span className="whitespace-nowrap">Export Statement PDF</span>
          </button>

          <button
            type="button"
            onClick={() => setShowIncomeModal(true)}
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-bold shadow-xs transition active:scale-95"
          >
            <ArrowDownLeft className="h-4 w-4 shrink-0" />
            <span className="whitespace-nowrap">Log Income</span>
          </button>

          <button
            type="button"
            onClick={() => setShowExpenseModal(true)}
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-900 hover:bg-blue-800 active:bg-blue-950 text-white text-xs font-bold shadow-xs transition active:scale-95"
          >
            <Plus className="h-4 w-4 text-orange-400 shrink-0" />
            <span className="whitespace-nowrap">Log Expense</span>
          </button>
        </div>
      </div>

      {/* Admin Action Required Banner: Borderless Warm Accent */}
      {summary.pendingApprovalsCount > 0 && (
        <div className="bg-amber-50 rounded-2xl p-4 sm:p-5 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-in fade-in duration-200">
          <div className="flex items-start sm:items-center gap-3 min-w-0">
            <div className="h-11 w-11 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-black text-amber-950 flex items-center gap-2 flex-wrap">
                <span>Executive Action Required:</span>
                <span className="px-2 py-0.5 rounded-full bg-amber-200 text-amber-900 text-xs font-bold">
                  {summary.pendingApprovalsCount} Expense(s) Awaiting Approval
                </span>
              </p>
              <p className="text-xs text-amber-900/90 mt-0.5 leading-relaxed">
                Totaling <strong className="font-mono font-bold text-amber-950">₹{summary.pendingApprovalsAmount.toLocaleString('en-IN')}</strong>. Mandated authorization by CEO & Proprietor{' '}
                <strong className="text-amber-950 font-bold underline underline-offset-2 decoration-amber-400">Sana Zeba Bakshi</strong> before disbursement release.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setActiveTab('pending')}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs transition shrink-0 active:scale-95 shadow-sm"
          >
            <span>Review Pending Queue ({summary.pendingApprovalsCount})</span>
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* KPI METRICS STRIP: Clean Borderless Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3.5 sm:gap-4">
        {/* Total Inflows (Income) */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl shadow-sm hover:shadow-md transition-all duration-200 flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <span className="text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wider text-slate-400 block truncate">
              Total Inflows (Income)
            </span>
            <span className="text-lg sm:text-xl lg:text-2xl font-black text-slate-900 mt-1 block font-mono tracking-tight truncate">
              ₹{summary.totalIncome.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className="text-[11px] text-emerald-700 font-bold mt-1 flex items-center gap-1 truncate">
              <Check className="h-3 w-3 shrink-0" />
              <span>Export Remittances & Advances</span>
            </span>
          </div>
          <div className="h-11 w-11 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold shrink-0">
            <ArrowDownLeft className="h-5 w-5" />
          </div>
        </div>

        {/* Total Expenses (Approved) */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl shadow-sm hover:shadow-md transition-all duration-200 flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <span className="text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wider text-slate-400 block truncate">
              Total Expenses (Approved)
            </span>
            <span className="text-lg sm:text-xl lg:text-2xl font-black text-slate-900 mt-1 block font-mono tracking-tight truncate">
              ₹{summary.totalExpenses.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className="text-[11px] text-slate-500 font-medium mt-1 block truncate">
              Audited & Sanctioned Outflows
            </span>
          </div>
          <div className="h-11 w-11 rounded-2xl bg-rose-50 text-rose-700 flex items-center justify-center font-bold shrink-0">
            <ArrowUpRight className="h-5 w-5" />
          </div>
        </div>

        {/* Net Operating Balance */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl shadow-sm hover:shadow-md transition-all duration-200 flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <span className="text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wider text-slate-400 block truncate">
              Net Operating Balance
            </span>
            <span
              className={`text-lg sm:text-xl lg:text-2xl font-black mt-1 block font-mono tracking-tight truncate ${
                summary.netProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'
              }`}
            >
              ₹{summary.netProfit.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className="text-[11px] text-slate-500 font-medium mt-1 block truncate">
              {summary.netProfit >= 0 ? 'Operating Surplus' : 'Operating Deficit'}
            </span>
          </div>
          <div className="h-11 w-11 rounded-2xl bg-blue-50 text-blue-900 flex items-center justify-center font-bold shrink-0">
            <Wallet className="h-5 w-5" />
          </div>
        </div>

        {/* Disbursement Security & Threshold */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl shadow-sm hover:shadow-md transition-all duration-200 flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <span className="text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wider text-slate-400 block truncate">
              Disbursement Security Gate
            </span>
            <span className="text-sm sm:text-base font-black text-slate-900 mt-1 block font-mono tracking-tight truncate">
              {TARGET_PHONE}
            </span>
            <span className="text-[10.5px] text-indigo-700 font-bold mt-1 block truncate">
              OTP Mandated for &gt; ₹2,000 Outflows
            </span>
          </div>
          <div className="h-11 w-11 rounded-2xl bg-indigo-50 text-indigo-900 flex items-center justify-center font-bold shrink-0">
            <Lock className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* TABS NAVIGATION: Modern Borderless Segmented Strip */}
      <div className="bg-white p-1.5 rounded-2xl shadow-sm flex items-center justify-between gap-2 overflow-x-auto scrollbar-none">
        <div className="flex items-center gap-1.5 flex-nowrap min-w-max">
          <button
            type="button"
            onClick={() => setActiveTab('ledger')}
            className={`px-3.5 sm:px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 shrink-0 ${
              activeTab === 'ledger'
                ? 'bg-blue-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <FileText className="h-3.5 w-3.5 shrink-0" />
            <span>General Ledger</span>
            <span
              className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${
                activeTab === 'ledger' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'
              }`}
            >
              {records.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('pending')}
            className={`px-3.5 sm:px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 shrink-0 ${
              activeTab === 'pending'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
            <span>Admin Approvals</span>
            {summary.pendingApprovalsCount > 0 && (
              <span
                className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${
                  activeTab === 'pending' ? 'bg-white/25 text-white' : 'bg-amber-100 text-amber-900'
                }`}
              >
                {summary.pendingApprovalsCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('analytics')}
            className={`px-3.5 sm:px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 shrink-0 ${
              activeTab === 'analytics'
                ? 'bg-blue-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <TrendingUp className="h-3.5 w-3.5 shrink-0" />
            <span>Cost Center Analytics</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('report')}
            className={`px-3.5 sm:px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 shrink-0 ${
              activeTab === 'report'
                ? 'bg-blue-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Building2 className="h-3.5 w-3.5 shrink-0" />
            <span>Financial Statement PDF</span>
          </button>
        </div>

        <button
          type="button"
          onClick={() => loadTransactions(true)}
          className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition shrink-0 ml-auto"
          title="Refresh Ledger"
          aria-label="Refresh Ledger"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin text-blue-900' : ''}`} />
        </button>
      </div>

      {/* TAB 1: GENERAL LEDGER */}
      {activeTab === 'ledger' && (
        <div className="space-y-4">
          {/* Search & Filter Toolbar: Clean Borderless Flow */}
          <div className="bg-white p-3.5 sm:p-4 rounded-2xl shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search by title, payee, vendor, reference or head..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-100/70 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-900 transition"
              />
            </div>

            {/* Filter Dropdowns Grid */}
            <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 flex-wrap">
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as any)}
                className="px-3 py-2 bg-slate-100/70 rounded-xl text-xs text-slate-700 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-900"
              >
                <option value="all">All Types</option>
                <option value="expense">Expenses Only</option>
                <option value="income">Income Only</option>
              </select>

              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as any)}
                className="px-3 py-2 bg-slate-100/70 rounded-xl text-xs text-slate-700 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-900"
              >
                <option value="all">All Statuses</option>
                <option value="approved">Approved</option>
                <option value="pending_approval">Pending Approval</option>
                <option value="rejected">Rejected</option>
              </select>

              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value as any)}
                className="px-3 py-2 bg-slate-100/70 rounded-xl text-xs text-slate-700 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-900 col-span-2 sm:col-span-1"
              >
                <option value="all">All Time</option>
                <option value="this_month">This Month</option>
                <option value="last_30_days">Last 30 Days</option>
              </select>

              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={resetFilters}
                  className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition flex items-center justify-center gap-1.5 col-span-2 sm:col-span-1"
                >
                  <RotateCcw className="h-3 w-3" />
                  <span>Reset</span>
                </button>
              )}
            </div>
          </div>

          {/* DESKTOP/TABLET VIEW: Structured White Corporate Table, Borderless */}
          <div className="hidden md:block bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto min-w-full">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-[10.5px] uppercase font-black tracking-wider text-slate-600">
                    <th className="py-3.5 px-4 min-w-[95px]">Date</th>
                    <th className="py-3.5 px-4 min-w-[240px]">Transaction & Cost Head</th>
                    <th className="py-3.5 px-4 min-w-[150px]">Payee / Beneficiary</th>
                    <th className="py-3.5 px-4 min-w-[140px]">Method & Ref</th>
                    <th className="py-3.5 px-4 min-w-[130px] text-right">Amount (INR)</th>
                    <th className="py-3.5 px-4 min-w-[125px] text-center">Status</th>
                    <th className="py-3.5 px-4 min-w-[130px] text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100/60 text-xs">
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-500">
                        <RefreshCw className="h-5 w-5 animate-spin mx-auto text-blue-900 mb-2" />
                        <span className="font-semibold">Loading corporate ledger records...</span>
                      </td>
                    </tr>
                  ) : filteredRecords.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-500">
                        <p className="font-bold text-slate-700">No transactions match your search or filter criteria.</p>
                        <p className="text-[11px] text-slate-400 mt-1">Try clearing filters or logging a new record.</p>
                      </td>
                    </tr>
                  ) : (
                    filteredRecords.map((item) => {
                      const isIncome = item.type === 'income';
                      const isApproved = item.status === 'approved';
                      const isPending = item.status === 'pending_approval';
                      const isRejected = item.status === 'rejected';

                      return (
                        <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3.5 px-4 text-slate-500 font-mono text-[11px] whitespace-nowrap align-top">
                            {item.transaction_date}
                          </td>
                          <td className="py-3.5 px-4 align-top">
                            <div className="flex items-start gap-2.5">
                              <span
                                className={`mt-0.5 p-1 rounded-lg shrink-0 ${
                                  isIncome
                                    ? 'bg-emerald-50 text-emerald-700'
                                    : 'bg-rose-50 text-rose-700'
                                }`}
                              >
                                {isIncome ? <ArrowDownLeft className="h-3.5 w-3.5" /> : <ArrowUpRight className="h-3.5 w-3.5" />}
                              </span>
                              <div className="min-w-0">
                                <p className="font-bold text-slate-900 leading-snug break-words">{item.title}</p>
                                <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                                  <span className="text-[10px] text-blue-950 font-bold px-2 py-0.5 rounded-md bg-blue-50">
                                    {item.category}
                                  </span>
                                  {item.requires_otp && (
                                    <span
                                      className="inline-flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded-md bg-indigo-50 text-indigo-800 font-bold"
                                      title="OTP authorization verified for > ₹2,000 threshold"
                                    >
                                      <Lock className="h-2.5 w-2.5 text-indigo-700" /> OTP Verified
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-slate-700 font-semibold align-top break-words">
                            {item.paid_to_or_from || '-'}
                          </td>
                          <td className="py-3.5 px-4 align-top">
                            <p className="text-slate-800 font-semibold truncate max-w-[160px]">{item.payment_method}</p>
                            {item.reference_number && (
                              <p className="text-[10px] text-slate-500 font-mono mt-0.5 truncate max-w-[160px]">
                                {item.reference_number}
                              </p>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-right font-black font-mono whitespace-nowrap text-sm align-top">
                            <span className={isIncome ? 'text-emerald-700' : 'text-slate-900'}>
                              {isIncome ? '+' : '-'}₹{Number(item.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-center whitespace-nowrap align-top">
                            {isApproved && (
                              <span className="inline-flex items-center gap-1 text-[10.5px] font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700">
                                <CheckCircle2 className="h-3 w-3 shrink-0" /> Approved
                              </span>
                            )}
                            {isPending && (
                              <span className="inline-flex items-center gap-1 text-[10.5px] font-bold px-2.5 py-1 rounded-full bg-amber-50 text-amber-800">
                                <Clock className="h-3 w-3 shrink-0" /> Awaiting Sana Zeba
                              </span>
                            )}
                            {isRejected && (
                              <span className="inline-flex items-center gap-1 text-[10.5px] font-bold px-2.5 py-1 rounded-full bg-rose-50 text-rose-700">
                                <XCircle className="h-3 w-3 shrink-0" /> Rejected
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-right whitespace-nowrap align-top">
                            <div className="flex items-center justify-end gap-1.5">
                              {isPending && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => handleApproveExpense(item)}
                                    className="px-2.5 py-1 rounded-lg bg-blue-900 hover:bg-blue-800 text-white font-bold text-[11px] transition shadow-xs active:scale-95"
                                    title="Approve as Sana Zeba Bakshi"
                                  >
                                    Approve
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSelectedRecordForApproval(item);
                                      setShowApprovalModal(true);
                                    }}
                                    className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-700 font-bold text-[11px] transition active:scale-95"
                                    title="Reject Expense"
                                  >
                                    Reject
                                  </button>
                                </>
                              )}
                              <button
                                type="button"
                                onClick={() => setRecordToDelete(item)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition active:scale-95"
                                title={`Delete ${item.type === 'expense' ? 'Expense' : 'Income'} Record`}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
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

          {/* MOBILE VIEW (<768px): Responsive Borderless Transaction Cards */}
          <div className="block md:hidden space-y-3">
            {loading ? (
              <div className="py-10 text-center bg-white rounded-2xl p-6 shadow-sm">
                <RefreshCw className="h-5 w-5 animate-spin mx-auto text-blue-900 mb-2" />
                <span className="text-xs font-semibold text-slate-600">Loading ledger records...</span>
              </div>
            ) : filteredRecords.length === 0 ? (
              <div className="py-10 text-center bg-white rounded-2xl p-6 shadow-sm">
                <p className="text-xs font-bold text-slate-700">No transactions match your search.</p>
                <p className="text-[11px] text-slate-400 mt-1">Try clearing filters.</p>
              </div>
            ) : (
              filteredRecords.map((item) => {
                const isIncome = item.type === 'income';
                const isApproved = item.status === 'approved';
                const isPending = item.status === 'pending_approval';
                const isRejected = item.status === 'rejected';

                return (
                  <div
                    key={item.id}
                    className="bg-white rounded-2xl p-4 shadow-sm space-y-3"
                  >
                    {/* Top Row: Date & Status */}
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-mono text-slate-500 font-semibold">
                        {item.transaction_date}
                      </span>
                      {isApproved && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">
                          <CheckCircle2 className="h-3 w-3" /> Approved
                        </span>
                      )}
                      {isPending && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800">
                          <Clock className="h-3 w-3" /> Pending Approval
                        </span>
                      )}
                      {isRejected && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700">
                          <XCircle className="h-3 w-3" /> Rejected
                        </span>
                      )}
                    </div>

                    {/* Middle: Title & Head */}
                    <div>
                      <div className="flex items-start gap-2">
                        <span
                          className={`mt-0.5 p-1 rounded-md shrink-0 ${
                            isIncome
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-rose-50 text-rose-700'
                          }`}
                        >
                          {isIncome ? <ArrowDownLeft className="h-3.5 w-3.5" /> : <ArrowUpRight className="h-3.5 w-3.5" />}
                        </span>
                        <h4 className="text-xs font-bold text-slate-900 leading-snug break-words">
                          {item.title}
                        </h4>
                      </div>
                      <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                        <span className="text-[10px] text-blue-950 font-bold px-2 py-0.5 rounded bg-blue-50">
                          {item.category}
                        </span>
                        {item.requires_otp && (
                          <span className="inline-flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-800 font-bold">
                            <Lock className="h-2.5 w-2.5 text-indigo-700" /> OTP Verified
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Payee & Method details */}
                    <div className="text-[11px] text-slate-600 space-y-1 pt-1">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400">Payee/Client:</span>
                        <span className="font-semibold text-slate-800 truncate max-w-[180px]">{item.paid_to_or_from || '-'}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400">Method/Ref:</span>
                        <span className="font-mono text-slate-700 truncate max-w-[180px]">{item.payment_method}</span>
                      </div>
                    </div>

                    {/* Bottom Row: Amount & Actions */}
                    <div className="flex items-center justify-between pt-2">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">Amount</span>
                        <span
                          className={`font-black font-mono text-base ${
                            isIncome ? 'text-emerald-700' : 'text-slate-900'
                          }`}
                        >
                          {isIncome ? '+' : '-'}₹{Number(item.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {isPending && (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedRecordForApproval(item);
                                setShowApprovalModal(true);
                              }}
                              className="px-2.5 py-1.5 rounded-lg bg-slate-100 text-slate-600 hover:text-rose-700 text-xs font-bold"
                            >
                              Reject
                            </button>
                            <button
                              type="button"
                              onClick={() => handleApproveExpense(item)}
                              className="px-3.5 py-1.5 rounded-lg bg-blue-900 hover:bg-blue-800 text-white text-xs font-bold shadow-xs"
                            >
                              Approve
                            </button>
                          </>
                        )}
                        <button
                          type="button"
                          onClick={() => setRecordToDelete(item)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition active:scale-95"
                          title={`Delete ${item.type === 'expense' ? 'Expense' : 'Income'} Record`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* TAB 2: PENDING APPROVALS QUEUE */}
      {activeTab === 'pending' && (
        <div className="space-y-4">
          <div className="bg-white p-5 rounded-2xl shadow-sm space-y-1">
            <h2 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-amber-600" />
              Sana Zeba Bakshi Executive Approval Queue
            </h2>
            <p className="text-xs text-slate-500 leading-relaxed">
              All company internal expenses require certified executive authorization by CEO & Proprietor Sana Zeba Bakshi.
              Disbursements above ₹2,000 must verify via OTP sent to +91 81499 09546 before reaching this queue.
            </p>
          </div>

          {pendingApprovalsList.length === 0 ? (
            <div className="py-16 text-center bg-white rounded-2xl shadow-sm p-6">
              <CheckCircle2 className="h-10 w-10 text-emerald-600 mx-auto mb-2 opacity-80" />
              <p className="text-sm font-black text-slate-900">No Pending Approvals</p>
              <p className="text-xs text-slate-500 mt-1">All internal expenses have been audited and authorized.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {pendingApprovalsList.map((item) => (
                <div
                  key={item.id}
                  className="bg-white p-5 rounded-2xl shadow-sm hover:shadow-md transition flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider bg-amber-50 px-2.5 py-0.5 rounded-full">
                        {item.category}
                      </span>
                      <span className="text-xs text-slate-500 font-mono font-semibold">{item.transaction_date}</span>
                    </div>

                    <h3 className="text-sm font-black text-slate-900 leading-snug break-words">{item.title}</h3>
                    {item.description && (
                      <p className="text-xs text-slate-500 leading-relaxed line-clamp-3">{item.description}</p>
                    )}

                    <div className="space-y-2 text-xs pt-2">
                      <div className="flex items-center justify-between text-slate-500">
                        <span>Payee / Beneficiary:</span>
                        <span className="font-bold text-slate-800 truncate max-w-[200px]">{item.paid_to_or_from || 'Direct Expense'}</span>
                      </div>
                      <div className="flex items-center justify-between text-slate-500">
                        <span>Payment Method:</span>
                        <span className="text-slate-800 font-medium truncate max-w-[200px]">{item.payment_method}</span>
                      </div>
                      <div className="flex items-center justify-between text-slate-500">
                        <span>Logged By:</span>
                        <span className="text-slate-800 font-medium">{item.logged_by_name}</span>
                      </div>
                      {item.requires_otp && (
                        <div className="flex items-center justify-between text-slate-500">
                          <span>Security Check:</span>
                          <span className="text-emerald-700 font-bold flex items-center gap-1">
                            <Lock className="h-3 w-3" /> OTP Verified (+91 81499 09546)
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="pt-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <p className="text-[10px] uppercase font-bold text-slate-400">Expense Value</p>
                      <p className="text-lg font-black text-slate-900 font-mono">
                        ₹{Number(item.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setRecordToDelete(item)}
                        className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition active:scale-95"
                        title="Delete Expense Record"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedRecordForApproval(item);
                          setShowApprovalModal(true);
                        }}
                        className="flex-1 sm:flex-none px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition"
                      >
                        Reject
                      </button>
                      <button
                        type="button"
                        onClick={() => handleApproveExpense(item)}
                        className="flex-1 sm:flex-none px-4 py-2 rounded-xl bg-blue-900 hover:bg-blue-800 text-white font-bold text-xs transition flex items-center justify-center gap-1.5 shadow-xs active:scale-95"
                      >
                        <Check className="h-3.5 w-3.5 text-orange-400" />
                        <span>Approve (Sana Zeba)</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: COST CENTER & CATEGORY ANALYTICS */}
      {activeTab === 'analytics' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            <div className="bg-white p-5 sm:p-6 rounded-2xl shadow-sm space-y-4">
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <TrendingDown className="h-4 w-4 text-rose-600" />
                Operational Expense Breakdown by Cost Center
              </h3>

              {summary.categoryBreakdown.length === 0 ? (
                <p className="text-xs text-slate-500 py-8 text-center font-medium">No approved expenses logged yet.</p>
              ) : (
                <div className="space-y-3.5">
                  {summary.categoryBreakdown.map((cat) => (
                    <div key={cat.category} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-800 truncate max-w-[200px]">{cat.category}</span>
                        <div className="text-right whitespace-nowrap">
                          <span className="font-mono font-black text-slate-900">
                            ₹{cat.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </span>
                          <span className="text-[10px] text-slate-500 ml-1.5">({cat.percentage.toFixed(1)}%)</span>
                        </div>
                      </div>
                      <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-900 rounded-full transition-all duration-500"
                          style={{ width: `${Math.min(100, Math.max(3, cat.percentage))}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-white p-5 sm:p-6 rounded-2xl shadow-sm flex flex-col justify-between space-y-4">
              <div className="space-y-4">
                <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-blue-900" />
                  Corporate Accounting Compliance Standards
                </h3>
                <div className="space-y-3 text-xs text-slate-600">
                  <div className="p-4 rounded-xl bg-slate-50 space-y-1">
                    <p className="font-black text-slate-900">Sheshaan Global Financial Governance Policy</p>
                    <p className="text-slate-600 leading-relaxed">
                      All procurement invoices, logistics freight disbursements, customs duties, and plant operating costs are reconcilable against APEDA, GSTIN, and Bank SWIFT records.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50 space-y-1">
                    <p className="font-black text-slate-900">Disbursement Authorization Thresholds</p>
                    <p className="text-slate-600 leading-relaxed">
                      1. Sub-₹2,000 Petty & Courier Outflows: Logged with vendor voucher, subject to monthly audit.
                      <br />
                      2. Above-₹2,000 Capital & Operational Outflows: Require two-factor SMS OTP verification dispatched to{' '}
                      <strong className="text-blue-900 font-bold">+91 81499 09546</strong>, followed by final sign-off from{' '}
                      <strong className="text-blue-900 font-bold">Sana Zeba Bakshi</strong>.
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-3.5 flex items-center justify-between text-xs text-slate-500">
                <span>Audited Ledger Count:</span>
                <span className="font-black text-slate-900">{records.length} Transactions</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: FINANCIAL STATEMENT PDF PREVIEW */}
      {activeTab === 'report' && (
        <div className="space-y-4">
          <div className="bg-white p-4 sm:p-5 rounded-2xl shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="min-w-0">
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2 flex-wrap">
                <Building2 className="h-4 w-4 text-blue-900 shrink-0" />
                <span>Live Corporate Financial Statement & Expense Audit Report</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                Formatted with the exact corporate typography, navy headers, words box, and dual seals followed in Sheshaan Global quotations.
              </p>
            </div>
            <button
              type="button"
              onClick={handleDownloadPDF}
              disabled={downloadingPdf}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-900 hover:bg-blue-800 text-white font-black text-xs transition shadow-xs active:scale-95 shrink-0"
            >
              {downloadingPdf ? (
                <RefreshCw className="h-4 w-4 animate-spin text-orange-400" />
              ) : (
                <Download className="h-4 w-4 text-orange-400" />
              )}
              <span>Download Official PDF</span>
            </button>
          </div>

          <div className="w-full h-[520px] sm:h-[680px] lg:h-[820px] bg-slate-100 rounded-2xl overflow-hidden shadow-xs">
            <PDFViewer width="100%" height="100%" className="border-0">
              <AccountingReportPDF
                records={records}
                summary={summary}
                dateRangeLabel="Financial Statement 2026"
                generatedBy="Accounts & Finance Department"
                reportRef={`SG-ACCR-${new Date().getFullYear()}-${String(records.length).padStart(4, '0')}`}
              />
            </PDFViewer>
          </div>
        </div>
      )}

      {/* MODAL: LOG EXPENSE (Viewport Adaptive, Sticky Header & Footer, Borderless) */}
      {showExpenseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-150">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl flex flex-col max-h-[92vh] my-auto animate-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="px-5 sm:px-6 py-4 flex items-center justify-between bg-slate-50 shrink-0 rounded-t-2xl">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="p-1.5 rounded-lg bg-blue-50 text-blue-900 font-bold shrink-0">
                  <ArrowUpRight className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-black text-slate-900 truncate">Log Internal Company Expense</h3>
                  <p className="text-[11px] text-slate-500 truncate">Record corporate expenditure for audit & approval</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowExpenseModal(false)}
                className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg transition shrink-0"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Scrollable Form Body */}
            <form onSubmit={handleExpenseSubmit} className="flex flex-col flex-1 min-h-0">
              <div className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1 overscroll-contain">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Expense Title / Cost Head *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Export Jute Packing Materials (325 Bags)"
                    value={expenseForm.title}
                    onChange={(e) => setExpenseForm({ ...expenseForm, title: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-100/70 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-900 transition"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Amount (INR) *</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">₹</span>
                      <input
                        type="number"
                        step="any"
                        required
                        placeholder="0.00"
                        value={expenseForm.amount}
                        onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                        className="w-full pl-7 pr-3 py-2.5 bg-slate-100/70 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-900 font-mono font-bold transition"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Cost Center / Category *</label>
                    <select
                      value={expenseForm.category}
                      onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value })}
                      className="w-full px-3 py-2.5 bg-slate-100/70 rounded-xl text-xs text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-900 font-medium transition"
                    >
                      {EXPENSE_CATEGORIES.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {parseFloat(expenseForm.amount) > 2000 && (
                  <div className="p-3.5 rounded-xl bg-amber-50 flex items-start gap-2.5">
                    <Lock className="h-4 w-4 text-amber-700 shrink-0 mt-0.5" />
                    <div className="text-[11px] text-amber-900 leading-relaxed">
                      <strong className="font-bold">Security Gate Notice:</strong> Amount exceeds ₹2,000 threshold.
                      An SMS / WhatsApp OTP will be dispatched to mobile <strong className="text-amber-950 font-bold">+91 81499 09546</strong> before submission.
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Paid To / Payee / Vendor *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Nagpur Spice Processing Co."
                      value={expenseForm.paid_to_or_from}
                      onChange={(e) => setExpenseForm({ ...expenseForm, paid_to_or_from: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-100/70 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-900 transition"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Payment Method *</label>
                    <select
                      value={expenseForm.payment_method}
                      onChange={(e) => setExpenseForm({ ...expenseForm, payment_method: e.target.value })}
                      className="w-full px-3 py-2.5 bg-slate-100/70 rounded-xl text-xs text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-900 font-medium transition"
                    >
                      {PAYMENT_METHODS.map((m) => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Transaction Date *</label>
                    <input
                      type="date"
                      required
                      value={expenseForm.transaction_date}
                      onChange={(e) => setExpenseForm({ ...expenseForm, transaction_date: e.target.value })}
                      className="w-full px-3 py-2.5 bg-slate-100/70 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-900 font-mono transition"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">UTR / Voucher / Ref #</label>
                    <input
                      type="text"
                      placeholder="e.g. NEFT-9876543210"
                      value={expenseForm.reference_number}
                      onChange={(e) => setExpenseForm({ ...expenseForm, reference_number: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-100/70 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-900 font-mono transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Notes / Expenditure Purpose</label>
                  <textarea
                    rows={2}
                    placeholder="Details of expense, batch reference, or business purpose..."
                    value={expenseForm.description}
                    onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-100/70 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-900 transition"
                  />
                </div>
              </div>

              {/* Sticky Footer */}
              <div className="px-5 sm:px-6 py-4 bg-slate-50 flex items-center justify-end gap-2 shrink-0 rounded-b-2xl">
                <button
                  type="button"
                  onClick={() => setShowExpenseModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-200/80 hover:bg-slate-300 text-slate-700 text-xs font-bold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-blue-900 hover:bg-blue-800 text-white text-xs font-bold transition shadow-xs active:scale-95 flex items-center gap-1.5"
                >
                  {parseFloat(expenseForm.amount) > 2000 ? (
                    <>
                      <Lock className="h-3.5 w-3.5 text-orange-400" />
                      <span>Proceed to OTP Verification</span>
                    </>
                  ) : (
                    <>
                      <Check className="h-3.5 w-3.5 text-orange-400" />
                      <span>Submit for Approval</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: OTP VERIFICATION (> ₹2,000 THRESHOLD) */}
      {showOtpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl flex flex-col max-h-[92vh] my-auto animate-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="p-5 sm:p-6 text-center bg-slate-50 shrink-0 rounded-t-2xl">
              <div className="h-12 w-12 rounded-2xl bg-blue-50 text-blue-900 flex items-center justify-center mx-auto mb-3 shadow-xs font-bold">
                <Lock className="h-6 w-6 text-blue-900" />
              </div>
              <h3 className="text-base font-black text-slate-900">Expense Security Verification</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                Disbursements exceeding ₹2,000 mandate OTP authorization sent to Sheshaan Global admin device.
              </p>
              <div className="mt-3 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-blue-50 text-xs font-mono font-bold text-blue-950">
                <Smartphone className="h-3.5 w-3.5 text-blue-900" />
                <span>{TARGET_PHONE}</span>
                <span className="text-[10px] text-slate-500 font-sans">({ADMIN_NAME})</span>
              </div>
            </div>

            {/* Scrollable Body */}
            <div className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1 overscroll-contain">
              {pendingExpenseData && (
                <div className="p-3.5 rounded-xl bg-slate-50 space-y-1.5 text-xs">
                  <div className="flex justify-between text-slate-500">
                    <span>Expense:</span>
                    <span className="font-bold text-slate-900 truncate max-w-[200px]">{pendingExpenseData.title}</span>
                  </div>
                  <div className="flex justify-between text-slate-500">
                    <span>Beneficiary:</span>
                    <span className="text-slate-800 font-medium truncate max-w-[200px]">{pendingExpenseData.paid_to_or_from}</span>
                  </div>
                  <div className="flex justify-between text-slate-500">
                    <span>Amount:</span>
                    <span className="font-black text-slate-900 font-mono text-sm">
                      ₹{Number(pendingExpenseData.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              )}

              {/* Delivery notification if sent via external bot */}
              {callmebotDelivered && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                  <div className="min-w-0">
                    <p className="font-bold">Dispatched from External Bot Number (+34 623 78 64 49)</p>
                    <p className="text-[11px] text-emerald-700">Automated WhatsApp OTP delivered to +91 81499 09546.</p>
                  </div>
                </div>
              )}

              {/* 100% Free WhatsApp Direct Dispatch */}
              {whatsappUrl && (
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-black text-xs shadow-md transition active:scale-95 group"
                >
                  <svg className="h-4 w-4 fill-current shrink-0" viewBox="0 0 24 24">
                    <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
                  </svg>
                  <span>📲 Deliver OTP to WhatsApp (+91 81499 09546) • 100% Free</span>
                </a>
              )}

              {/* Free External Number Bot Gateway Setup */}
              <div className="border border-slate-200/90 rounded-xl overflow-hidden text-xs">
                <button
                  type="button"
                  onClick={() => setShowGatewayConfig(!showGatewayConfig)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 hover:bg-slate-100 flex items-center justify-between text-slate-700 font-bold transition text-left"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm">🤖</span>
                    <span>Free Cloud Bot External Number (+34 623 78 64 49)</span>
                  </div>
                  <span className="text-[11px] text-blue-900 font-medium">
                    {showGatewayConfig ? 'Hide Guide ▲' : (callmebotApiKey ? 'Configured ✓ ▼' : 'Configure Free ▼')}
                  </span>
                </button>

                {showGatewayConfig && (
                  <div className="p-3.5 bg-white space-y-2.5 border-t border-slate-100">
                    <p className="text-[11px] text-slate-600 leading-relaxed">
                      To receive automatic messages dispatched from CallMeBot’s external server number (<b>+34 623 78 64 49</b>) for free:
                    </p>
                    <ol className="list-decimal pl-4 space-y-1 text-[11px] text-slate-600">
                      <li>
                        From <b>+91 81499 09546</b>, tap below to send a one-time message to the bot:
                      </li>
                      <li className="list-none pt-1">
                        <a
                          href="https://wa.me/34623786449?text=I%20allow%20callmebot%20to%20send%20me%20messages"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-300 font-bold hover:bg-emerald-100 transition text-[11px]"
                        >
                          <span>Send: "I allow callmebot to send me messages"</span>
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </li>
                      <li className="pt-1">
                        The bot immediately replies with your free personal <b>API Key</b>.
                      </li>
                      <li>Paste that API key below:</li>
                    </ol>

                    <div className="flex gap-2 pt-1">
                      <input
                        type="text"
                        placeholder="e.g. 9812450"
                        value={callmebotApiKey}
                        onChange={(e) => {
                          const val = e.target.value.trim();
                          setCallmebotApiKey(val);
                          if (typeof window !== 'undefined') {
                            localStorage.setItem('portal_callmebot_key', val);
                          }
                        }}
                        className="flex-1 px-3 py-1.5 rounded-lg bg-slate-100 text-xs font-mono border border-slate-300 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-900"
                      />
                      <button
                        type="button"
                        onClick={handleResendOtp}
                        className="px-3 py-1.5 rounded-lg bg-blue-900 text-white font-bold text-xs hover:bg-blue-800 transition"
                      >
                        Save & Dispatch
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Instant Verification Helper with 1-Click Auto-Fill */}
              {demoOtpHint && (
                <div className="p-3.5 rounded-xl bg-blue-50 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <span className="text-[10px] uppercase font-bold text-slate-500 block truncate">Instant Security Code</span>
                    <span className="font-mono font-black text-blue-950 text-lg tracking-widest block">{demoOtpHint}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setOtpCode(demoOtpHint)}
                    className="px-3.5 py-1.5 rounded-lg bg-blue-900 hover:bg-blue-800 text-white font-bold text-xs shadow-xs transition active:scale-95 flex items-center gap-1.5 shrink-0"
                  >
                    <Check className="h-3.5 w-3.5 text-orange-400" />
                    <span>Auto-Fill OTP</span>
                  </button>
                </div>
              )}

              {otpError && (
                <div className="p-3 rounded-xl bg-rose-50 text-rose-800 text-xs flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600" />
                  <span>{otpError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 text-center">
                  Enter 6-Digit Verification Code
                </label>
                <input
                  type="text"
                  maxLength={6}
                  autoFocus
                  placeholder="------"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="w-full text-center tracking-[0.5em] text-2xl font-mono font-black py-3 bg-slate-100/70 rounded-xl text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-900 transition"
                />
              </div>

              <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
                <span>Didn't receive SMS?</span>
                <button
                  type="button"
                  disabled={otpTimer > 0 || otpLoading}
                  onClick={handleResendOtp}
                  className={`font-bold transition ${
                    otpTimer > 0 ? 'text-slate-400 cursor-not-allowed' : 'text-blue-900 hover:underline'
                  }`}
                >
                  {otpTimer > 0 ? `Resend code in ${otpTimer}s` : 'Resend OTP Code'}
                </button>
              </div>
            </div>

            {/* Sticky Footer */}
            <div className="px-5 sm:px-6 py-4 bg-slate-50 flex items-center justify-end gap-2 shrink-0 rounded-b-2xl">
              <button
                type="button"
                onClick={() => {
                  setShowOtpModal(false);
                  setPendingExpenseData(null);
                }}
                className="px-4 py-2.5 rounded-xl bg-slate-200/80 hover:bg-slate-300 text-slate-700 text-xs font-bold transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={otpLoading || otpCode.length !== 6}
                onClick={handleVerifyOtp}
                className="px-5 py-2.5 rounded-xl bg-blue-900 hover:bg-blue-800 text-white font-black text-xs transition shadow-xs active:scale-95 flex items-center gap-1.5 disabled:opacity-50"
              >
                {otpLoading ? (
                  <RefreshCw className="h-3.5 w-3.5 animate-spin text-orange-400" />
                ) : (
                  <ShieldCheck className="h-3.5 w-3.5 text-orange-400" />
                )}
                <span>Verify & Submit</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: LOG INCOME */}
      {showIncomeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-150">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl flex flex-col max-h-[92vh] my-auto animate-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="px-5 sm:px-6 py-4 flex items-center justify-between bg-slate-50 shrink-0 rounded-t-2xl">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 font-bold shrink-0">
                  <ArrowDownLeft className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-black text-slate-900 truncate">Log Inward Company Income</h3>
                  <p className="text-[11px] text-slate-500 truncate">Record commercial export remittance or operational inflow</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowIncomeModal(false)}
                className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg transition shrink-0"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Scrollable Form Body */}
            <form onSubmit={handleIncomeSubmit} className="flex flex-col flex-1 min-h-0">
              <div className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1 overscroll-contain">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Income Title / Purpose *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Export Wire Remittance for Khor Fakkan SG-2026-0001"
                    value={incomeForm.title}
                    onChange={(e) => setIncomeForm({ ...incomeForm, title: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-100/70 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-900 transition"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Amount (INR) *</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">₹</span>
                      <input
                        type="number"
                        step="any"
                        required
                        placeholder="0.00"
                        value={incomeForm.amount}
                        onChange={(e) => setIncomeForm({ ...incomeForm, amount: e.target.value })}
                        className="w-full pl-7 pr-3 py-2.5 bg-slate-100/70 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-900 font-mono font-bold transition"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Category / Stream *</label>
                    <select
                      value={incomeForm.category}
                      onChange={(e) => setIncomeForm({ ...incomeForm, category: e.target.value })}
                      className="w-full px-3 py-2.5 bg-slate-100/70 rounded-xl text-xs text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-900 font-medium transition"
                    >
                      {INCOME_CATEGORIES.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Received From / Client *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. BusyExim Private Limited, UAE"
                      value={incomeForm.paid_to_or_from}
                      onChange={(e) => setIncomeForm({ ...incomeForm, paid_to_or_from: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-100/70 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-900 transition"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Payment Method *</label>
                    <select
                      value={incomeForm.payment_method}
                      onChange={(e) => setIncomeForm({ ...incomeForm, payment_method: e.target.value })}
                      className="w-full px-3 py-2.5 bg-slate-100/70 rounded-xl text-xs text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-900 font-medium transition"
                    >
                      {PAYMENT_METHODS.map((m) => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Credit Date *</label>
                    <input
                      type="date"
                      required
                      value={incomeForm.transaction_date}
                      onChange={(e) => setIncomeForm({ ...incomeForm, transaction_date: e.target.value })}
                      className="w-full px-3 py-2.5 bg-slate-100/70 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-900 font-mono transition"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">FIRC / UTR / Reference #</label>
                    <input
                      type="text"
                      placeholder="e.g. SWIFT-FIRCF-778811"
                      value={incomeForm.reference_number}
                      onChange={(e) => setIncomeForm({ ...incomeForm, reference_number: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-100/70 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-900 font-mono transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Notes / Remittance Particulars</label>
                  <textarea
                    rows={2}
                    placeholder="Details of remittance advice, invoice reference, bank charges..."
                    value={incomeForm.description}
                    onChange={(e) => setIncomeForm({ ...incomeForm, description: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-100/70 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-900 transition"
                  />
                </div>
              </div>

              {/* Sticky Footer */}
              <div className="px-5 sm:px-6 py-4 bg-slate-50 flex items-center justify-end gap-2 shrink-0 rounded-b-2xl">
                <button
                  type="button"
                  onClick={() => setShowIncomeModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-200/80 hover:bg-slate-300 text-slate-700 text-xs font-bold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-xs active:scale-95 flex items-center gap-1.5"
                >
                  <Check className="h-3.5 w-3.5" />
                  <span>Log Income Inflow</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: REJECT EXPENSE REMARKS */}
      {showApprovalModal && selectedRecordForApproval && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl flex flex-col max-h-[92vh] my-auto animate-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="px-5 sm:px-6 py-4 bg-slate-50 flex items-center justify-between shrink-0 rounded-t-2xl">
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <XCircle className="h-4 w-4 text-rose-600" />
                Reject Expense Disbursement
              </h3>
              <button
                type="button"
                onClick={() => setShowApprovalModal(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1 overscroll-contain">
              <p className="text-xs text-slate-600 leading-relaxed">
                You are rejecting the expense voucher for{' '}
                <strong className="text-slate-900 font-bold">{selectedRecordForApproval.title}</strong> (₹
                {Number(selectedRecordForApproval.amount).toLocaleString('en-IN')}).
              </p>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Rejection Reason / Executive Remarks *
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="State reason for declining disbursement..."
                  value={rejectionNotes}
                  onChange={(e) => setRejectionNotes(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-100/70 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-600"
                />
              </div>
            </div>

            {/* Sticky Footer */}
            <div className="px-5 sm:px-6 py-4 bg-slate-50 flex items-center justify-end gap-2 shrink-0 rounded-b-2xl">
              <button
                type="button"
                onClick={() => setShowApprovalModal(false)}
                className="px-4 py-2.5 rounded-xl bg-slate-200/80 hover:bg-slate-300 text-slate-700 text-xs font-bold transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRejectExpense}
                className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition shadow-xs active:scale-95"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: DELETE CONFIRMATION */}
      {recordToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl flex flex-col max-h-[92vh] my-auto animate-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="px-5 sm:px-6 py-4 bg-slate-50 flex items-center justify-between shrink-0 rounded-t-2xl">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center">
                  <Trash2 className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">
                    Delete {recordToDelete.type === 'expense' ? 'Expense' : 'Income'} Record
                  </h3>
                  <span className="text-[10px] text-slate-400 font-mono">ID: {recordToDelete.id}</span>
                </div>
              </div>
              <button
                type="button"
                disabled={deleteLoading}
                onClick={() => setRecordToDelete(null)}
                className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1 overscroll-contain">
              <p className="text-xs text-slate-600 leading-relaxed">
                Are you sure you want to permanently delete this {recordToDelete.type === 'expense' ? 'expense record' : 'income entry'} from the company accounting ledger?
              </p>

              {/* Record Summary Card */}
              <div className="p-4 rounded-xl bg-slate-50 space-y-2 text-xs">
                <div className="flex justify-between items-start gap-2">
                  <span className="text-slate-500 shrink-0">Cost Head:</span>
                  <span className="font-bold text-slate-900 text-right leading-snug break-words">{recordToDelete.title}</span>
                </div>
                <div className="flex justify-between items-center text-slate-500">
                  <span>Category:</span>
                  <span className="font-semibold text-slate-800">{recordToDelete.category}</span>
                </div>
                <div className="flex justify-between items-center text-slate-500">
                  <span>Payee / Source:</span>
                  <span className="font-semibold text-slate-800 truncate max-w-[200px]">{recordToDelete.paid_to_or_from || 'Direct Expense'}</span>
                </div>
                <div className="flex justify-between items-center text-slate-500">
                  <span>Transaction Date:</span>
                  <span className="font-mono text-slate-700">{recordToDelete.transaction_date}</span>
                </div>
                <div className="flex justify-between items-center text-slate-500 pt-2 border-t border-slate-200/80">
                  <span className="font-bold text-slate-700">Amount:</span>
                  <span className="font-mono font-black text-rose-700 text-base">
                    ₹{Number(recordToDelete.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {/* Warning Alert */}
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5">
                <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
                <p className="text-[11px] leading-relaxed">
                  <strong>Permanent Action:</strong> This record will be deleted from the database. Financial ledger summaries, P&L calculations, and PDF financial reports will be recalculated immediately.
                </p>
              </div>
            </div>

            {/* Sticky Footer */}
            <div className="px-5 sm:px-6 py-4 bg-slate-50 flex items-center justify-end gap-2 shrink-0 rounded-b-2xl">
              <button
                type="button"
                disabled={deleteLoading}
                onClick={() => setRecordToDelete(null)}
                className="px-4 py-2.5 rounded-xl bg-slate-200/80 hover:bg-slate-300 text-slate-700 text-xs font-bold transition disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleteLoading}
                onClick={handleDeleteRecord}
                className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition shadow-xs active:scale-95 flex items-center gap-1.5 disabled:opacity-50"
              >
                {deleteLoading ? (
                  <RefreshCw className="h-3.5 w-3.5 animate-spin text-white" />
                ) : (
                  <Trash2 className="h-3.5 w-3.5 text-white" />
                )}
                <span>{deleteLoading ? 'Deleting...' : 'Delete Permanently'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
