import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, Landmark, Coins, X, Check, Edit2, Trash2, Clock } from 'lucide-react';
import { CustomerDue } from '../types';
import { formatCurrency, toBanglaNumber, formatDate, formatTimeStr } from '../utils';

interface DueListProps {
  dueList: CustomerDue[];
  isBangla: boolean;
  onDeposit: (customerName: string, amount: number) => void;
  onDelete: (customerName: string) => void;
  onRename: (oldName: string, newName: string) => void;
  onViewDetail?: (customerName: string) => void;
}

export default function DueList({ dueList, isBangla, onDeposit, onDelete, onRename, onViewDetail }: DueListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [depositingCustomer, setDepositingCustomer] = useState<string | null>(null);
  const [depositAmount, setDepositAmount] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');

  const [editingCustomer, setEditingCustomer] = useState<string | null>(null);
  const [newNameValue, setNewNameValue] = useState<string>('');
  const [deletingCustomer, setDeletingCustomer] = useState<string | null>(null);

  const filteredDues = dueList.filter((cd) => 
    cd.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalOutstandingDue = dueList.reduce((sum, item) => sum + item.amount, 0);

  const startDeposit = (customer: CustomerDue) => {
    setDepositingCustomer(customer.name);
    setEditingCustomer(null);
    setDeletingCustomer(null);
    setDepositAmount('');
    setErrorMsg('');
  };

  const cancelDeposit = () => {
    setDepositingCustomer(null);
    setDepositAmount('');
    setErrorMsg('');
  };

  const startRename = (customer: CustomerDue) => {
    setEditingCustomer(customer.name);
    setNewNameValue(customer.name);
    setDepositingCustomer(null);
    setDeletingCustomer(null);
  };

  const cancelRename = () => {
    setEditingCustomer(null);
    setNewNameValue('');
  };

  const handleRenameSubmit = (oldName: string) => {
    if (!newNameValue.trim()) return;
    onRename(oldName, newNameValue.trim());
    setEditingCustomer(null);
    setNewNameValue('');
  };

  const startDeleteConfirm = (customer: CustomerDue) => {
    setDeletingCustomer(customer.name);
    setDepositingCustomer(null);
    setEditingCustomer(null);
  };

  const handleDepositSubmit = (customerName: string, maxDue: number) => {
    const amt = parseFloat(depositAmount);
    if (isNaN(amt) || amt <= 0) {
      setErrorMsg(isBangla ? 'সঠিক টাকা লিখুন' : 'Enter a valid amount');
      return;
    }
    if (amt > maxDue) {
      setErrorMsg(
        isBangla 
          ? `সর্বোচ্চ ${formatCurrency(maxDue, true)} জমা করা যাবে` 
          : `Cannot deposit more than ${formatCurrency(maxDue, false)}`
      );
      return;
    }

    onDeposit(customerName, amt);
    cancelDeposit();
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-3xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <h3 className="text-base font-bold text-slate-800 tracking-tight flex items-center gap-2">
            <span className="text-rose-500">●</span>
            {isBangla ? 'বাকির খাতাপত্র (গ্রাহকের তালিকা)' : 'Outstanding Dues List'}
          </h3>
          <p className="text-xs text-slate-500">
            {isBangla 
              ? `সর্বমোট বকেয়া: ${formatCurrency(totalOutstandingDue, true)} (${toBanglaNumber(filteredDues.length)} জন ক্রেতা)` 
              : `Total Outstanding: ${formatCurrency(totalOutstandingDue, false)} (${filteredDues.length} customers)`}
          </p>
        </div>

        {/* Search Input */}
        <div className="relative">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400">
            <Search className="h-4 w-4" />
          </span>
          <input
            type="text"
            placeholder={isBangla ? 'ক্রেতার নাম খুঁজুন...' : 'Search customer...'}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full sm:w-56 pl-9 pr-4 py-1.5 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-teal-500 focus:border-teal-500 bg-slate-50/50"
          />
        </div>
      </div>

      {filteredDues.length === 0 ? (
        <div className="text-center py-8 border border-dashed border-slate-150 rounded-xl bg-slate-50/50">
          <p className="text-slate-400 text-sm">
            {isBangla ? 'কোনো বকেয়া হিসাব পাওয়া যায়নি' : 'No dues listed'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 max-h-[450px] overflow-y-auto pr-1">
          <AnimatePresence initial={false}>
            {filteredDues.map((cd) => {
              return (
                <motion.div
                  key={cd.name}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="p-2 sm:p-2.5 rounded-xl border border-slate-100 bg-rose-50/10 hover:bg-rose-50/20 hover:border-rose-100/60 flex flex-col justify-between gap-2 transition-all shadow-3xs"
                >
                  {/* Main card row: Info on left, Actions on right */}
                  <div className="flex items-center justify-between gap-1.5">
                    <div className="flex items-start gap-1.5 min-w-0 flex-1">
                      <span className="p-1 bg-rose-50 text-rose-600 rounded-md shrink-0 mt-0.5">
                        <Landmark className="h-3.5 w-3.5" />
                      </span>
                      <div 
                        className="min-w-0 cursor-pointer group flex-1"
                        onClick={() => onViewDetail?.(cd.name)}
                        title={isBangla ? 'বিস্তারিত খতিয়ান দেখতে ক্লিক করুন' : 'Click to view detailed ledger'}
                      >
                        <h4 className="text-xs font-bold text-slate-800 group-hover:text-rose-600 group-hover:underline truncate" title={cd.name}>
                          {cd.name}
                        </h4>
                        <div className="flex items-center gap-1 text-[10px] text-slate-500 font-bold">
                          <span>{isBangla ? 'বাকি:' : 'Due:'}</span>
                          <span className="text-rose-600 font-black group-hover:text-rose-700">
                            {formatCurrency(cd.amount, isBangla)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Action triggers */}
                    <div className="flex items-center gap-0.5 shrink-0 bg-slate-50/50 p-0.5 rounded-lg border border-slate-100">
                      <button
                        onClick={() => startRename(cd)}
                        className="p-1 text-slate-400 hover:text-teal-600 hover:bg-teal-50 rounded transition-colors cursor-pointer"
                        title={isBangla ? 'নাম পরিবর্তন' : 'Rename Customer'}
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => startDeleteConfirm(cd)}
                        className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                        title={isBangla ? 'মুছে ফেলুন' : 'Delete Customer'}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => startDeposit(cd)}
                        className="text-[9px] text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100/85 px-1.5 py-1 rounded font-bold flex items-center gap-0.5 transition-all cursor-pointer shadow-3xs active:scale-95"
                      >
                        <Coins className="h-2.5 w-2.5" />
                        <span>{isBangla ? 'জমা' : 'Deposit'}</span>
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Screen-level Overlay Modals for Smooth Popups */}
      <AnimatePresence>
        {/* 1. DEPOSIT MODAL */}
        {depositingCustomer && (() => {
          const cust = dueList.find(c => c.name === depositingCustomer);
          if (!cust) return null;
          return (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={cancelDeposit}
                className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs"
              />
              {/* Modal Card */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 15 }}
                transition={{ type: 'spring', duration: 0.3 }}
                className="bg-white w-full max-w-md rounded-2xl border border-slate-200 p-6 shadow-2xl relative z-10 space-y-4"
              >
                <button
                  onClick={cancelDeposit}
                  className="absolute top-4 right-4 p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>

                <div className="flex items-center gap-2.5">
                  <span className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                    <Coins className="h-5 w-5" />
                  </span>
                  <div>
                    <h3 className="text-base font-extrabold text-slate-800">
                      {isBangla ? 'বকেয়া টাকা জমা করুন' : 'Record Due Payment'}
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {isBangla ? `${cust.name}-এর হিসাব পরিশোধ জমা` : `Record deposit for ${cust.name}`}
                    </p>
                  </div>
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-150 flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500">
                    {isBangla ? 'বর্তমান বকেয়া বাকি:' : 'Current Outstanding Due:'}
                  </span>
                  <span className="text-sm font-black text-rose-600">
                    {formatCurrency(cust.amount, isBangla)}
                  </span>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600 block">
                    {isBangla ? 'জমা টাকার পরিমাণ লিখুন' : 'Enter Deposit Amount'}
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-sm font-black text-slate-400 pointer-events-none">
                      ৳
                    </span>
                    <input
                      type="number"
                      placeholder="0"
                      value={depositAmount}
                      onChange={(e) => {
                        let val = e.target.value;
                        if (val.length > 1 && val.startsWith('0') && !val.startsWith('0.')) {
                          val = val.replace(/^0+/, '');
                        }
                        setDepositAmount(val);
                        setErrorMsg('');
                      }}
                      autoFocus
                      className="w-full pl-8 pr-4 py-2.5 text-sm font-bold border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500 shadow-3xs"
                    />
                  </div>
                  {errorMsg && (
                    <p className="text-xs text-rose-600 font-bold flex items-center gap-1 mt-1">
                      <span>●</span> {errorMsg}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={cancelDeposit}
                    className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl cursor-pointer transition-all active:scale-98"
                  >
                    {isBangla ? 'বাতিল' : 'Cancel'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDepositSubmit(cust.name, cust.amount)}
                    className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl cursor-pointer transition-all active:scale-98 shadow-sm"
                  >
                    {isBangla ? 'জমা নিশ্চিত করুন' : 'Confirm Deposit'}
                  </button>
                </div>
              </motion.div>
            </div>
          );
        })()}

        {/* 2. RENAME (EDIT) MODAL */}
        {editingCustomer && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={cancelRename}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs"
            />
            {/* Modal Card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ type: 'spring', duration: 0.3 }}
              className="bg-white w-full max-w-md rounded-2xl border border-slate-200 p-6 shadow-2xl relative z-10 space-y-4"
            >
              <button
                onClick={cancelRename}
                className="absolute top-4 right-4 p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>

              <div className="flex items-center gap-2.5">
                <span className="p-2 bg-teal-50 text-teal-600 rounded-xl">
                  <Edit2 className="h-5 w-5" />
                </span>
                <div>
                  <h3 className="text-base font-extrabold text-slate-800">
                    {isBangla ? 'ক্রেতার নাম সংশোধন' : 'Edit Customer Name'}
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {isBangla ? 'নাম পরিবর্তন বা সংশোধন করুন' : 'Modify customer details'}
                  </p>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600 block">
                  {isBangla ? 'নতুন নাম লিখুন' : 'Enter New Name'}
                </label>
                <input
                  type="text"
                  placeholder={isBangla ? 'ক্রেতার নাম লিখুন' : 'Customer name'}
                  value={newNameValue}
                  onChange={(e) => setNewNameValue(e.target.value)}
                  autoFocus
                  className="w-full px-4 py-2.5 text-sm font-bold border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-1 focus:ring-teal-500 shadow-3xs"
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={cancelRename}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl cursor-pointer transition-all active:scale-98"
                >
                  {isBangla ? 'বাতিল' : 'Cancel'}
                </button>
                <button
                  type="button"
                  onClick={() => handleRenameSubmit(editingCustomer)}
                  className="flex-1 py-2.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-xl cursor-pointer transition-all active:scale-98 shadow-sm"
                >
                  {isBangla ? 'নাম সংরক্ষণ করুন' : 'Save Name'}
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* 3. DELETE CONFIRMATION MODAL */}
        {deletingCustomer && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDeletingCustomer(null)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs"
            />
            {/* Modal Card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ type: 'spring', duration: 0.3 }}
              className="bg-white w-full max-w-sm rounded-2xl border border-slate-200 p-6 shadow-2xl relative z-10 space-y-4"
            >
              <div className="flex justify-center">
                <span className="p-3.5 bg-rose-50 text-rose-600 rounded-full">
                  <Trash2 className="h-6 w-6" />
                </span>
              </div>

              <div className="text-center space-y-1.5">
                <h3 className="text-base font-extrabold text-slate-800">
                  {isBangla ? 'হিসাব মুছে ফেলার নিশ্চিতকরণ' : 'Confirm Account Deletion'}
                </h3>
                <p className="text-xs text-slate-500 font-bold leading-relaxed px-2">
                  {isBangla 
                    ? `আপনি কি নিশ্চিতভাবে "${deletingCustomer}"-এর সকল বকেয়া হিসাব মুছে ফেলতে চান? এই অ্যাকশনটি ফিরিয়ে নেওয়া যাবে না।` 
                    : `Are you sure you want to delete all outstanding dues for "${deletingCustomer}"? This action cannot be undone.`}
                </p>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setDeletingCustomer(null)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl cursor-pointer transition-all active:scale-98"
                >
                  {isBangla ? 'না, রাখুন' : 'No, Keep It'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onDelete(deletingCustomer);
                    setDeletingCustomer(null);
                  }}
                  className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl cursor-pointer transition-all active:scale-98 shadow-sm"
                >
                  {isBangla ? 'হ্যাঁ, ডিলিট করুন' : 'Yes, Delete'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
