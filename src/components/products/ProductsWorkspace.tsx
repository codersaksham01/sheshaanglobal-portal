'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Package,
  Plus,
  Search,
  Edit2,
  Trash2,
  RefreshCw,
  X,
  Check,
  TrendingUp,
  Tag,
  Scale
} from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { getPortalCache, setPortalCache } from '../../lib/portalDataStore';
import { Product } from '../../lib/types';

const blankProduct: Partial<Product> = {
  sku: '',
  description: '',
  unit_price: 0,
  cost_price: 0,
  weight: 0,
  dimensions: ''
};

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(amount);
}

export function ProductsWorkspace() {
  const [products, setProducts] = useState<Product[]>(() => {
    return getPortalCache()?.products || [];
  });
  const [loading, setLoading] = useState(() => !getPortalCache()?.products?.length);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingProduct, setEditingProduct] = useState<Partial<Product> | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const fetchProducts = useCallback(async () => {
    try {
      const { data, error } = await supabase.from('products').select('*').order('sku');
      if (!error && data) {
        setProducts(data);
        setPortalCache({ products: data });
      }
    } catch (e) {
      console.warn('Failed to fetch products:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const filteredProducts = useMemo(() => {
    if (!searchQuery.trim()) return products;
    const q = searchQuery.toLowerCase();
    return products.filter(
      (p) =>
        p.sku.toLowerCase().includes(q) ||
        p.description?.toLowerCase().includes(q) ||
        p.dimensions?.toLowerCase().includes(q)
    );
  }, [products, searchQuery]);

  const handleOpenForm = (product?: Product) => {
    setEditingProduct(product ? { ...product } : { ...blankProduct });
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setEditingProduct(null);
    setIsFormOpen(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct?.sku?.trim()) {
      alert('Please enter a product SKU.');
      return;
    }

    setSaving(true);
    try {
      if (editingProduct.id) {
        // Update
        const { error } = await supabase
          .from('products')
          .update(editingProduct)
          .eq('id', editingProduct.id);
        if (error) throw error;
        setProducts((prev) =>
          prev.map((p) => (p.id === editingProduct.id ? ({ ...p, ...editingProduct } as Product) : p))
        );
        showToast('Product updated successfully.');
      } else {
        // Create
        const { data, error } = await supabase
          .from('products')
          .insert([editingProduct])
          .select()
          .single();
        if (error) throw error;
        if (data) {
          setProducts((prev) => [...prev, data]);
        }
        showToast('New product SKU registered.');
      }
      handleCloseForm();
      fetchProducts();
    } catch (err: any) {
      alert(err.message || 'Failed to save product.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, sku: string) => {
    if (!confirm(`Are you sure you want to delete SKU "${sku}"?`)) return;
    try {
      await supabase.from('products').delete().eq('id', id);
      setProducts((prev) => prev.filter((p) => p.id !== id));
      showToast('Product deleted.');
    } catch {
      alert('Failed to delete product.');
    }
  };

  return (
    <div className="space-y-5">
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 rounded-xl bg-slate-950 px-4 py-2.5 text-xs font-bold text-white shadow-2xl animate-fade-up">
          {toastMessage}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/80 pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">Products Catalog</h1>
          <p className="text-xs font-semibold text-slate-500 mt-0.5">
            Manage commodity specifications, selling prices, base procurement costs, and gross weights.
          </p>
        </div>
        <button
          type="button"
          onClick={() => handleOpenForm()}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-extrabold shadow-sm active:scale-95 transition"
        >
          <Plus className="h-4 w-4" />
          <span>Register Product SKU</span>
        </button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Total SKUs</p>
          <p className="mt-1 text-2xl font-black text-slate-950">{products.length}</p>
          <p className="mt-1 text-xs font-semibold text-slate-500">Active export items</p>
        </div>
        <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/60 p-4">
          <p className="text-[10px] font-black uppercase tracking-wider text-emerald-700">Average Unit Price</p>
          <p className="mt-1 text-xl font-black text-slate-950 truncate">
            {formatCurrency(
              products.length
                ? products.reduce((acc, p) => acc + (Number(p.unit_price) || 0), 0) / products.length
                : 0
            )}
          </p>
          <p className="mt-1 text-xs font-semibold text-slate-600">Per kg average</p>
        </div>
        <div className="rounded-xl border border-sky-200/80 bg-sky-50/60 p-4">
          <p className="text-[10px] font-black uppercase tracking-wider text-sky-700">Average Cost</p>
          <p className="mt-1 text-xl font-black text-slate-950 truncate">
            {formatCurrency(
              products.length
                ? products.reduce((acc, p) => acc + (Number(p.cost_price) || 0), 0) / products.length
                : 0
            )}
          </p>
          <p className="mt-1 text-xs font-semibold text-slate-600">Per kg procurement</p>
        </div>
        <div className="rounded-xl border border-indigo-200/80 bg-indigo-50/60 p-4">
          <p className="text-[10px] font-black uppercase tracking-wider text-indigo-700">Target Margin</p>
          <p className="mt-1 text-xl font-black text-slate-950 truncate">
            {products.length
              ? `${Math.round(
                  (products.reduce(
                    (acc, p) => acc + ((Number(p.unit_price) || 0) - (Number(p.cost_price) || 0)),
                    0
                  ) /
                    Math.max(
                      products.reduce((acc, p) => acc + (Number(p.unit_price) || 0), 0),
                      1
                    )) *
                    100
                )}%`
              : '0%'}
          </p>
          <p className="mt-1 text-xs font-semibold text-slate-600">Estimated markup</p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search products by SKU, description, specifications, or packaging dimensions..."
          className="w-full pl-9 pr-3 py-2.5 bg-white border border-slate-200 rounded-xl font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition text-xs"
        />
      </div>

      {/* Products Table & Grid */}
      {loading && products.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200/80 shadow-xs">
          <RefreshCw className="h-7 w-7 animate-spin text-sky-600 mx-auto mb-2" />
          <p className="text-sm font-bold text-slate-800">Loading catalog...</p>
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200/80 shadow-xs">
          <Package className="h-10 w-10 text-slate-300 mx-auto mb-3" />
          <p className="text-sm font-bold text-slate-700">No products match your search</p>
          <button
            type="button"
            onClick={() => handleOpenForm()}
            className="mt-4 px-3.5 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-bold transition hover:bg-slate-800"
          >
            Add New Product
          </button>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200/90 bg-white shadow-xs">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200/80 bg-slate-50/50 text-[10px] uppercase font-black tracking-wider text-slate-500">
                <th className="py-3 px-4 font-black">SKU</th>
                <th className="py-3 px-4 font-black">Description & Specifications</th>
                <th className="py-3 px-4 font-black text-right">Selling Price / kg</th>
                <th className="py-3 px-4 font-black text-right">Cost Price / kg</th>
                <th className="py-3 px-4 font-black text-right">Gross Weight</th>
                <th className="py-3 px-4 font-black text-center w-24">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredProducts.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50/80 transition select-none">
                  <td className="py-3 px-4 font-mono font-black text-slate-900">
                    <span className="bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                      {p.sku}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <p className="font-extrabold text-slate-900">{p.description || 'N/A'}</p>
                    {p.dimensions && (
                      <p className="text-[10px] text-slate-400 mt-0.5 font-semibold">Dimensions: {p.dimensions}</p>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-black text-emerald-700">
                    {formatCurrency(Number(p.unit_price) || 0)}
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-semibold text-slate-500">
                    {formatCurrency(Number(p.cost_price) || 0)}
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-bold text-slate-700">
                    {p.weight ? `${p.weight} kg` : 'N/A'}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleOpenForm(p)}
                        className="p-1.5 hover:bg-slate-100 text-slate-500 hover:text-slate-800 rounded-lg transition"
                        title="Edit Product"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(p.id, p.sku)}
                        className="p-1.5 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg transition"
                        title="Delete Product"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal / Drawer for Add / Edit Product */}
      {isFormOpen && editingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-xs">
          <div className="relative w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl animate-panel-in">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <h3 className="text-base font-black text-slate-900">
                {editingProduct.id ? 'Edit Product SKU' : 'Register New Product'}
              </h3>
              <button
                type="button"
                onClick={handleCloseForm}
                className="h-8 w-8 rounded-lg bg-slate-100 text-slate-500 hover:text-slate-800 flex items-center justify-center transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-slate-600 mb-1">
                  SKU Code *
                </label>
                <input
                  type="text"
                  required
                  value={editingProduct.sku || ''}
                  onChange={(e) => setEditingProduct({ ...editingProduct, sku: e.target.value })}
                  placeholder="e.g. BASMATI-1121-SELLA"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                />
              </div>

              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-slate-600 mb-1">
                  Description & Specifications
                </label>
                <textarea
                  rows={3}
                  value={editingProduct.description || ''}
                  onChange={(e) => setEditingProduct({ ...editingProduct, description: e.target.value })}
                  placeholder="Grain length, moisture content, Sortex cleanliness, packaging notes..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-black uppercase tracking-wider text-slate-600 mb-1">
                    Selling Price / kg (INR)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={editingProduct.unit_price || ''}
                    onChange={(e) => setEditingProduct({ ...editingProduct, unit_price: parseFloat(e.target.value) || 0 })}
                    placeholder="0.00"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-black uppercase tracking-wider text-slate-600 mb-1">
                    Cost Price / kg (INR)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={editingProduct.cost_price || ''}
                    onChange={(e) => setEditingProduct({ ...editingProduct, cost_price: parseFloat(e.target.value) || 0 })}
                    placeholder="0.00"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-black uppercase tracking-wider text-slate-600 mb-1">
                    Gross Weight / Unit (kg)
                  </label>
                  <input
                    type="number"
                    step="0.001"
                    value={editingProduct.weight || ''}
                    onChange={(e) => setEditingProduct({ ...editingProduct, weight: parseFloat(e.target.value) || 0 })}
                    placeholder="50"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-black uppercase tracking-wider text-slate-600 mb-1">
                    Dimensions (LxWxH)
                  </label>
                  <input
                    type="text"
                    value={editingProduct.dimensions || ''}
                    onChange={(e) => setEditingProduct({ ...editingProduct, dimensions: e.target.value })}
                    placeholder="e.g. 60x40x25 cm"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleCloseForm}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-extrabold shadow-sm transition active:scale-95 disabled:opacity-50"
                >
                  {saving ? 'Saving...' : editingProduct.id ? 'Save Changes' : 'Register SKU'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
