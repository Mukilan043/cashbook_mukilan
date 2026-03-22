import { useRef, useState } from 'react';
import { transactionAPI, receiptAPI } from '../services/api';
import { format } from 'date-fns';
import {
  DEFAULT_CATEGORIES,
  encodeDescription,
  inferCategory,
  learnCategory,
} from '../utils/transactionSmart';

const CashOutflow = ({ cashbookId, onDone }) => {
  const [formData, setFormData] = useState({
    amount: '',
    description: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    category: '',
    customCategory: '',
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [scanLoading, setScanLoading] = useState(false);
  const [scanError, setScanError] = useState('');
  const [receiptFile, setReceiptFile] = useState(null);
  const [receiptPreview, setReceiptPreview] = useState('');
  const [receiptItems, setReceiptItems] = useState([]);
  const [receiptTotal, setReceiptTotal] = useState('');
  const [receiptType, setReceiptType] = useState('outflow');
  const [dragActive, setDragActive] = useState(false);
  const [openMenuKey, setOpenMenuKey] = useState(null);
  const [editingItems, setEditingItems] = useState([]);
  const [isListening, setIsListening] = useState(false);
  const [voiceError, setVoiceError] = useState('');
  const recognitionRef = useRef(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    if (name === 'description') {
      const suggested = inferCategory(value);
      setFormData(prev => ({
        ...prev,
        category: prev.category || suggested,
      }));
    }
  };

  const setReceiptFromFile = (file) => {
    if (!file) return;
    setReceiptFile(file);
    setScanError('');
    setReceiptItems([]);
    setReceiptTotal('');
    setReceiptType('outflow');

    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = () => setReceiptPreview(String(reader.result));
      reader.readAsDataURL(file);
    } else {
      setReceiptPreview('');
    }
  };

  const handleReceiptPick = (e) => {
    const file = e.target.files?.[0];
    setReceiptFromFile(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setDragActive(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    setReceiptFromFile(file);
  };

  const handleScanReceipt = async () => {
    if (!receiptFile) {
      setScanError('Please upload a receipt first');
      return;
    }

    setScanLoading(true);
    setScanError('');

    try {
      const result = await receiptAPI.scanReceipt(receiptFile);
      setReceiptType(result.type || 'outflow');
      const items = Array.isArray(result.items) ? result.items : [];
      setReceiptItems(items.map((item) => ({
        name: item.name || '',
        amount: String(item.amount ?? ''),
        type: item.type || result.type || 'outflow',
      })));
      setReceiptTotal(result.total != null ? String(result.total) : '');

      const hasInflow = items.some((item) => (item.type || result.type || 'outflow') === 'inflow');
      const hasOutflow = items.some((item) => (item.type || result.type || 'outflow') === 'outflow');
      if (!hasOutflow && hasInflow) {
        setScanError('This receipt looks like an inflow. Please add it in Cash Inflow.');
      }
    } catch (error) {
      setScanError(error.response?.data?.error || 'Failed to scan receipt');
    } finally {
      setScanLoading(false);
    }
  };

  const handleReceiptItemChange = (index, field, value) => {
    setReceiptItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  };

  const toggleEditItem = (key) => {
    setEditingItems((prev) =>
      prev.includes(key) ? prev.filter((i) => i !== key) : [...prev, key]
    );
  };

  const handleRemoveReceiptItem = (index) => {
    setReceiptItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleClearReceipt = () => {
    setReceiptFile(null);
    setReceiptPreview('');
    setReceiptItems([]);
    setReceiptTotal('');
    setReceiptType('outflow');
    setScanError('');
  };

  const handleAddTransactions = async (itemsToAdd, type) => {
    if (!cashbookId) {
      setMessage({ type: 'error', text: 'Please select a cashbook first' });
      return;
    }

    const cleaned = itemsToAdd
      .map((item) => ({
        name: String(item.name || '').trim(),
        amount: Number(item.amount),
      }))
      .filter((item) => item.name && Number.isFinite(item.amount) && item.amount > 0);

    if (cleaned.length === 0) {
      setScanError('No valid items found. Please edit or enter manually.');
      return;
    }

    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      for (const item of cleaned) {
        const suggested = inferCategory(item.name);
        learnCategory({ description: item.name, category: suggested });
        await transactionAPI.create(cashbookId, {
          type,
          amount: Number(item.amount),
          description: encodeDescription({ description: item.name, category: suggested }),
          date: formData.date,
        });
      }

      setMessage({ type: 'success', text: 'Receipt items added successfully!' });
      setScanError('');
      const cleanedKeys = new Set(cleaned.map((item) => `${item.name}__${Number(item.amount)}`));
      const nextItems = receiptItems.filter((item) => {
        const itemType = item.type || type;
        if (itemType !== type) return true;
        const key = `${String(item.name || '').trim()}__${Number(item.amount)}`;
        return !cleanedKeys.has(key);
      });
      setReceiptItems(nextItems);
      if (nextItems.length === 0) {
        setReceiptTotal('');
        setReceiptFile(null);
        setReceiptPreview('');
      }

      if (window.refreshBalance) {
        window.refreshBalance();
      }

      if (nextItems.length === 0 && typeof onDone === 'function') {
        onDone();
      }
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.error || 'Failed to add receipt items' });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!cashbookId) {
      setMessage({ type: 'error', text: 'Please select a cashbook first' });
      return;
    }
    
    if (!formData.amount || isNaN(parseFloat(formData.amount)) || parseFloat(formData.amount) <= 0) {
      window.alert('Please enter the amount');
      setMessage({ type: 'error', text: 'Please enter a valid amount greater than 0' });
      return;
    }

    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      const categoryToSave = formData.category === '__custom__'
        ? formData.customCategory
        : formData.category;

      learnCategory({ description: formData.description, category: categoryToSave });

      await transactionAPI.create(cashbookId, {
        type: 'outflow',
        amount: parseFloat(formData.amount),
        description: encodeDescription({ description: formData.description, category: categoryToSave }),
        date: formData.date,
      });

      setMessage({ type: 'success', text: 'Cash outflow added successfully!' });
      setFormData({
        amount: '',
        description: '',
        date: format(new Date(), 'yyyy-MM-dd'),
        category: '',
        customCategory: '',
      });

      // Refresh balance
      if (window.refreshBalance) {
        window.refreshBalance();
      }

      if (typeof onDone === 'function') {
        onDone();
      }
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.error || 'Failed to add cash outflow' 
      });
    } finally {
      setLoading(false);
    }
  };

  const handleVoiceInput = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setVoiceError('Voice input is not supported in this browser. Use Chrome on desktop or Android.');
      return;
    }

    if (window.isSecureContext === false && window.location.hostname !== 'localhost') {
      setVoiceError('Voice input requires HTTPS or localhost.');
      return;
    }

    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      return;
    }

    setVoiceError('');
    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    recognition.lang = 'en-IN';
    recognition.interimResults = true;
    recognition.continuous = true;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => {
      setIsListening(false);
      recognitionRef.current = null;
    };
    recognition.onerror = (event) => {
      setIsListening(false);
      if (event.error === 'no-speech') {
        setVoiceError('No speech detected. Please speak closer to the mic.');
      } else if (event.error === 'not-allowed') {
        setVoiceError('Microphone permission blocked. Please allow access.');
      } else if (event.error === 'audio-capture') {
        setVoiceError('No microphone found. Please check your device.');
      } else {
        setVoiceError(`Voice input failed: ${event.error || 'unknown error'}`);
      }
    };
    recognition.onspeechend = () => {
      recognition.stop();
    };
    recognition.onresult = (event) => {
      let finalTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscript += result[0]?.transcript || '';
        }
      }
      if (!finalTranscript.trim()) return;
      setFormData((prev) => {
        const nextDescription = prev.description
          ? `${prev.description} ${finalTranscript}`.trim()
          : finalTranscript.trim();
        const suggested = inferCategory(nextDescription);
        return {
          ...prev,
          description: nextDescription,
          category: prev.category || suggested,
        };
      });
    };

    recognition.start();
  };

  const inflowItems = receiptItems
    .map((item, index) => ({ item, index }))
    .filter(({ item }) => (item.type || 'inflow') === 'inflow');
  const outflowItems = receiptItems
    .map((item, index) => ({ item, index }))
    .filter(({ item }) => (item.type || 'outflow') === 'outflow');
  const inflowOnlyItems = inflowItems.map(({ item }) => item);
  const outflowOnlyItems = outflowItems.map(({ item }) => item);
  const inflowTotal = inflowOnlyItems.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const outflowTotal = outflowOnlyItems.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const showInflowSection = inflowItems.length > 0 && outflowItems.length > 0;

  return (
    <div className="max-w-md mx-auto cd-card" style={{ padding: '24px' }}>
      <h2 className="text-2xl font-bold mb-6" style={{ color: 'var(--cd-danger)' }}>Cash Outflow</h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div
          className={`rounded-lg border border-dashed px-4 py-3 ${dragActive ? 'border-red-500 bg-red-100 ring-2 ring-red-200' : 'border-red-300 bg-red-50'}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <div className="flex flex-col gap-2">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <div className="text-sm font-semibold text-red-700">Upload Receipt</div>
                <div className="text-xs text-red-600">Drag and drop, or upload (JPG, PNG, PDF)</div>
              </div>
              <label className="inline-flex items-center gap-2 rounded-md bg-white px-3 py-2 text-xs font-semibold text-red-700 shadow cursor-pointer">
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={handleReceiptPick}
                  className="hidden"
                />
                Upload Receipt
              </label>
            </div>

            {receiptFile && (
              <div className="flex items-center justify-between text-xs text-red-700">
                <span>Selected: {receiptFile.name}</span>
                <button
                  type="button"
                  onClick={handleClearReceipt}
                  className="text-xs font-semibold text-rose-600 hover:text-rose-700"
                >
                  Remove
                </button>
              </div>
            )}

            {receiptPreview && (
              <div className="rounded-md border border-red-200 bg-white p-2">
                <img src={receiptPreview} alt="Receipt preview" className="w-full max-h-40 object-contain" />
              </div>
            )}

            <button
              type="button"
              onClick={handleScanReceipt}
              disabled={scanLoading}
              className="inline-flex w-full items-center justify-center rounded-md bg-red-600 px-3 py-2 text-xs font-semibold text-white shadow hover:bg-red-700 disabled:opacity-60"
            >
              {scanLoading ? 'Scanning…' : 'Scan Receipt'}
            </button>

            {scanError && (
              <div className="text-xs text-rose-600">{scanError}</div>
            )}
          </div>
        </div>

        {receiptItems.length > 0 && (
          <div className="rounded-lg border border-red-200 bg-white p-3 space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold text-gray-800">Detected Items</div>
            </div>
            {showInflowSection && (
              <div className="space-y-2">
                <div className="text-xs font-semibold text-green-700">Inflow items</div>
                {inflowItems.map(({ item, index }) => {
                  const key = `inflow-${index}`;
                  return (
                    <div key={key} className="grid grid-cols-7 gap-2 items-center">
                      <input
                        type="text"
                        value={item.name}
                        onChange={(e) => handleReceiptItemChange(index, 'name', e.target.value)}
                        readOnly={!editingItems.includes(key)}
                        className="col-span-4 w-full cd-input text-sm"
                        placeholder="Item name"
                      />
                      <input
                        type="number"
                        value={item.amount}
                        onChange={(e) => handleReceiptItemChange(index, 'amount', e.target.value)}
                        readOnly={!editingItems.includes(key)}
                        className="col-span-2 w-full cd-input text-sm"
                        placeholder="Amount"
                      />
                      <div className="relative col-span-1 flex justify-end">
                        <button
                          type="button"
                          onClick={() => setOpenMenuKey(openMenuKey === key ? null : key)}
                          className="text-xs font-semibold text-gray-600 hover:text-gray-800"
                          aria-label="Receipt item actions"
                        >
                          ...
                        </button>
                        {openMenuKey === key && (
                          <div className="absolute right-0 top-6 z-10 w-24 rounded-md border border-green-200 bg-white shadow">
                            <button
                              type="button"
                              onClick={() => {
                                toggleEditItem(key);
                                setOpenMenuKey(null);
                              }}
                              className="block w-full px-3 py-2 text-left text-xs text-gray-700 hover:bg-green-50"
                            >
                              {editingItems.includes(key) ? 'Done' : 'Edit'}
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                handleRemoveReceiptItem(index);
                                setOpenMenuKey(null);
                              }}
                              className="block w-full px-3 py-2 text-left text-xs text-rose-600 hover:bg-rose-50"
                            >
                              Remove
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
                <button
                  type="button"
                  onClick={() => handleAddTransactions(inflowOnlyItems, 'inflow')}
                  disabled={loading}
                  className="w-full rounded-md bg-green-600 px-3 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-60"
                >
                  {inflowOnlyItems.length > 1 ? 'Add All Transactions' : 'Add Transaction'}
                </button>
                <div className="flex items-center justify-between text-xs text-gray-600">
                  <span>Total</span>
                  <span>{inflowTotal.toFixed(2)}</span>
                </div>
              </div>
            )}
            {outflowItems.length > 0 && (
              <div className="space-y-2">
                <div className="text-xs font-semibold text-red-700">Outflow items</div>
                {outflowItems.map(({ item, index }) => {
                  const key = `outflow-${index}`;
                  return (
                    <div key={key} className="grid grid-cols-7 gap-2 items-center">
                      <input
                        type="text"
                        value={item.name}
                        onChange={(e) => handleReceiptItemChange(index, 'name', e.target.value)}
                        readOnly={!editingItems.includes(key)}
                        className="col-span-4 w-full cd-input text-sm"
                        placeholder="Item name"
                      />
                      <input
                        type="number"
                        value={item.amount}
                        onChange={(e) => handleReceiptItemChange(index, 'amount', e.target.value)}
                        readOnly={!editingItems.includes(key)}
                        className="col-span-2 w-full cd-input text-sm"
                        placeholder="Amount"
                      />
                      <div className="relative col-span-1 flex justify-end">
                        <button
                          type="button"
                          onClick={() => setOpenMenuKey(openMenuKey === key ? null : key)}
                          className="text-xs font-semibold text-gray-600 hover:text-gray-800"
                          aria-label="Receipt item actions"
                        >
                          ...
                        </button>
                        {openMenuKey === key && (
                          <div className="absolute right-0 top-6 z-10 w-24 rounded-md border border-red-200 bg-white shadow">
                            <button
                              type="button"
                              onClick={() => {
                                toggleEditItem(key);
                                setOpenMenuKey(null);
                              }}
                              className="block w-full px-3 py-2 text-left text-xs text-gray-700 hover:bg-red-50"
                            >
                              {editingItems.includes(key) ? 'Done' : 'Edit'}
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                handleRemoveReceiptItem(index);
                                setOpenMenuKey(null);
                              }}
                              className="block w-full px-3 py-2 text-left text-xs text-rose-600 hover:bg-rose-50"
                            >
                              Remove
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
                <button
                  type="button"
                  onClick={() => handleAddTransactions(outflowOnlyItems, 'outflow')}
                  disabled={loading}
                  className="w-full rounded-md bg-red-600 px-3 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
                >
                  {outflowOnlyItems.length > 1 ? 'Add All Transactions' : 'Add Transaction'}
                </button>
                <div className="flex items-center justify-between text-xs text-gray-600">
                  <span>Total</span>
                  <span>{outflowTotal.toFixed(2)}</span>
                </div>
              </div>
            )}
          </div>
        )}

        <div>
          <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-1">
            Amount *
          </label>
          <input
            type="number"
            id="amount"
            name="amount"
            value={formData.amount}
            onChange={handleChange}
            step="0.01"
            min="0.01"
            className="cd-input" style={{ borderColor: 'var(--cd-danger)' }}
            placeholder="Enter amount"
          />
        </div>

        <div>
          <div className="flex items-center justify-between">
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <button
              type="button"
              onClick={handleVoiceInput}
              className="inline-flex items-center gap-1 text-xs font-semibold text-red-700 hover:text-red-800"
              aria-label="Voice input"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                <path d="M12 19v4" />
                <path d="M8 23h8" />
              </svg>
              {isListening ? 'Listening…' : 'Voice'}
            </button>
          </div>
          <input
            type="text"
            id="description"
            name="description"
            value={formData.description}
            onChange={handleChange}
            className="cd-input" style={{ borderColor: 'var(--cd-danger)' }}
            placeholder="Enter description (optional)"
          />
          {voiceError && (
            <div className="text-xs text-rose-600 mt-1">{voiceError}</div>
          )}
        </div>

        <div>
          <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
            Category
          </label>
          <select
            id="category"
            name="category"
            value={formData.category}
            onChange={handleChange}
            className="cd-select" style={{ borderColor: 'var(--cd-danger)' }}
          >
            <option value="">Auto-detect</option>
            {DEFAULT_CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
            <option value="__custom__">Custom…</option>
          </select>
          {formData.category === '__custom__' && (
            <input
              type="text"
              name="customCategory"
              value={formData.customCategory}
              onChange={handleChange}
              className="cd-input mt-2" style={{ borderColor: 'var(--cd-danger)' }}
              placeholder="e.g. Pet Care"
            />
          )}
        </div>

        <div>
          <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-1">
            Date *
          </label>
          <input
            type="date"
            id="date"
            name="date"
            value={formData.date}
            onChange={handleChange}
            className="cd-input" style={{ borderColor: 'var(--cd-danger)' }}
          />
        </div>

        {message.text && (
          <div className={`p-3 rounded-md ${
            message.type === 'success' 
              ? 'bg-green-100 text-green-700' 
              : 'bg-red-100 text-red-700'
          }`}>
            {message.text}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Adding...' : 'Add Cash Outflow'}
        </button>
      </form>
    </div>
  );
};

export default CashOutflow;





