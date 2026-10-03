'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  BookOpen, Users, CheckCircle, Clock, AlertCircle, 
  XCircle, Plus, Cloud, CloudOff, RefreshCw, Download, 
  UserPlus, FileSpreadsheet, Check, Trash2, Edit3, Calendar, Menu, X
} from 'lucide-react';

const STATUS_CONFIG = {
  SUBMITTED: { label: '已繳交', color: 'bg-emerald-500 text-white', icon: CheckCircle },
  LATE: { label: '遲交', color: 'bg-amber-500 text-white', icon: Clock },
  CORRECTION_PENDING: { label: '待訂正', color: 'bg-orange-500 text-white', icon: AlertCircle },
  MISSING: { label: '缺交', color: 'bg-rose-500 text-white', icon: XCircle }
};

const CLASSES = ['1A', '1B', '1C', '2A', '2C', '3A', '3D', '5D'];
const SUBJECTS = ['歷史', '公經社', '公民'];

export default function HomeworkMaster() {
  const [apiUrl, setApiUrl] = useState('');
  const [selectedClass, setSelectedClass] = useState('1A');
  const [selectedSubject, setSelectedSubject] = useState('中文');
  const [activeTab, setActiveTab] = useState('check'); 
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // 資料狀態
  const [students, setStudents] = useState([]);
  const [homeworks, setHomeworks] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [selectedHomeworkId, setSelectedHomeworkId] = useState('');

  // 彈窗狀態
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingHomework, setEditingHomework] = useState(null); // 修改功課
  const [newTitle, setNewTitle] = useState('');
  const [newMaxScore, setNewMaxScore] = useState(100);
  const [newDueDate, setNewDueDate] = useState(new Date().toISOString().split('T')[0]);

  // 批量批改與名單匯入
  const [batchScore, setBatchScore] = useState('');
  const [importText, setImportText] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState(null);

  // 初始化 API URL
  useEffect(() => {
    const savedUrl = localStorage.getItem('hk_hw_api_url') || '';
    setApiUrl(savedUrl);
    
    // 初始化範例資料
    const sampleStudents = [
      { student_id: '1A01', class_name: '1A', seat_no: 1, student_num: '202401', name_zh: '陳大文' },
      { student_id: '1A02', class_name: '1A', seat_no: 2, student_num: '202402', name_zh: '李小玲' },
      { student_id: '1A03', class_name: '1A', seat_no: 3, student_num: '202403', name_zh: '張子豪' }
    ];
    setStudents(sampleStudents);

    const today = new Date().toISOString().split('T')[0];
    const sampleHw = [
      { homework_id: 'hw_1', subject_name: '中文', class_name: '1A', title: '第一課 默寫練習', max_score: 100, created_at: today, due_date: today }
    ];
    setHomeworks(sampleHw);
    setSelectedHomeworkId('hw_1');
  }, []);

  const saveApiUrl = (url) => {
    setApiUrl(url);
    localStorage.setItem('hk_hw_api_url', url);
  };

  // 雲端同步
  const syncWithCloud = async () => {
    if (!apiUrl) {
      alert('請先在頁首輸入並儲存 Google Apps Script Web App URL！');
      return;
    }
    setSyncing(true);
    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'SYNC_ALL',
          students,
          homeworks,
          submissions
        })
      });
      const resData = await response.json();
      if (resData.status === 'success') {
        setLastSyncTime(new Date().toLocaleTimeString());
        alert('雲端同步成功！');
      } else {
        alert('同步失敗：' + resData.message);
      }
    } catch (err) {
      alert('連線失敗，請檢查 API 網址與網路設定。');
    } finally {
      setSyncing(false);
    }
  };

  // 當前篩選的功課清單
  const filteredHomeworks = useMemo(() => {
    return homeworks.filter(h => h.class_name === selectedClass && h.subject_name === selectedSubject);
  }, [homeworks, selectedClass, selectedSubject]);

  // 當前選擇的功課物件
  const activeHomework = useMemo(() => {
    return homeworks.find(h => h.homework_id === selectedHomeworkId);
  }, [homeworks, selectedHomeworkId]);

  // 當前班別學生清單
  const classStudents = useMemo(() => {
    return students.filter(s => s.class_name === selectedClass).sort((a, b) => a.seat_no - b.seat_no);
  }, [students, selectedClass]);

  // 新增功課
  const handleAddHomework = (e) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    const newId = 'hw_' + Date.now();
    const newHw = {
      homework_id: newId,
      subject_name: selectedSubject,
      class_name: selectedClass,
      title: newTitle,
      max_score: Number(newMaxScore) || 100,
      created_at: new Date().toISOString().split('T')[0],
      due_date: newDueDate
    };
    setHomeworks([...homeworks, newHw]);
    setSelectedHomeworkId(newId);
    setNewTitle('');
    setShowAddModal(false);
  };

  // 修改功課 (編輯)
  const handleEditHomework = (e) => {
    e.preventDefault();
    if (!editingHomework) return;
    setHomeworks(homeworks.map(h => h.homework_id === editingHomework.homework_id ? editingHomework : h));
    setEditingHomework(null);
  };

  // 刪除功課
  const handleDeleteHomework = (hwId, hwTitle) => {
    if (confirm(`確定要刪除功課「${hwTitle}」嗎？相關的繳交紀錄亦會被移除。`)) {
      setHomeworks(homeworks.filter(h => h.homework_id !== hwId));
      setSubmissions(submissions.filter(sub => sub.homework_id !== hwId));
      if (selectedHomeworkId === hwId) {
        const remaining = homeworks.filter(h => h.homework_id !== hwId && h.class_name === selectedClass && h.subject_name === selectedSubject);
        setSelectedHomeworkId(remaining.length > 0 ? remaining[0].homework_id : '');
      }
    }
  };

  // 更新單一學生繳交狀態
  const handleStatusChange = (studentId, status) => {
    if (!selectedHomeworkId) return;
    const existingIndex = submissions.findIndex(s => s.homework_id === selectedHomeworkId && s.student_id === studentId);
    
    if (existingIndex >= 0) {
      const updated = [...submissions];
      updated[existingIndex] = { ...updated[existingIndex], status, submitted_at: new Date().toISOString() };
      setSubmissions(updated);
    } else {
      const newSub = {
        submission_id: `sub_${Date.now()}_${studentId}`,
        homework_id: selectedHomeworkId,
        student_id: studentId,
        status,
        score: null,
        feedback: '',
        submitted_at: new Date().toISOString()
      };
      setSubmissions([...submissions, newSub]);
    }
  };

  // 獲取學生狀態
  const getStudentSubmission = (studentId) => {
    return submissions.find(s => s.homework_id === selectedHomeworkId && s.student_id === studentId);
  };

  // 匯入學生名單
  const handleImportStudents = () => {
    if (!importText.trim()) return;
    const lines = importText.split('\n');
    const newStudentList = [...students.filter(s => s.class_name !== selectedClass)];

    lines.forEach((line) => {
      const parts = line.trim().split(/[\t\s]+/);
      if (parts.length >= 2) {
        const seatNo = parseInt(parts[0], 10);
        const name = parts[1];
        if (!isNaN(seatNo)) {
          newStudentList.push({
            student_id: `${selectedClass}${seatNo.toString().padStart(2, '0')}`,
            class_name: selectedClass,
            seat_no: seatNo,
            student_num: `${new Date().getFullYear()}${seatNo.toString().padStart(2, '0')}`,
            name_zh: name
          });
        }
      }
    });

    setStudents(newStudentList);
    setImportText('');
    alert(`成功匯入 ${selectedClass} 班學生名單！`);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 pb-12">
      {/* 頁首 / 導覽列 (響應式手機版) */}
      <header className="bg-blue-700 text-white shadow-md sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <BookOpen className="h-6 w-6 text-amber-300" />
            <h1 className="text-xl font-bold tracking-wide">功課 Master (HK)</h1>
          </div>

          {/* 手機選單按鈕 */}
          <button 
            className="md:hidden p-2 rounded-lg bg-blue-800 text-white"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>

          {/* 桌面版控制項 */}
          <div className="hidden md:flex items-center space-x-4">
            <div className="flex items-center bg-blue-800 rounded-lg px-3 py-1.5 text-sm">
              <Cloud className="h-4 w-4 mr-2 text-blue-200" />
              <input 
                type="text" 
                placeholder="貼上 GAS Web App URL" 
                value={apiUrl}
                onChange={(e) => saveApiUrl(e.target.value)}
                className="bg-transparent text-white placeholder-blue-300 focus:outline-none w-48 text-xs"
              />
            </div>
            <button 
              onClick={syncWithCloud}
              disabled={syncing}
              className="flex items-center space-x-1 bg-amber-400 hover:bg-amber-300 text-blue-950 font-semibold px-3 py-1.5 rounded-lg text-sm shadow transition"
            >
              <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
              <span>{syncing ? '同步中...' : '同步雲端'}</span>
            </button>
          </div>
        </div>

        {/* 手機版展開選單 */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-blue-800 px-4 py-3 border-t border-blue-600 space-y-3">
            <div className="flex items-center bg-blue-900 rounded-lg px-3 py-2 text-sm">
              <Cloud className="h-4 w-4 mr-2 text-blue-200 shrink-0" />
              <input 
                type="text" 
                placeholder="貼上 GAS Web App URL" 
                value={apiUrl}
                onChange={(e) => saveApiUrl(e.target.value)}
                className="bg-transparent text-white placeholder-blue-300 focus:outline-none w-full text-xs"
              />
            </div>
            <button 
              onClick={syncWithCloud}
              disabled={syncing}
              className="w-full flex items-center justify-center space-x-2 bg-amber-400 text-blue-950 font-bold py-2 rounded-lg text-sm shadow"
            >
              <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
              <span>{syncing ? '同步中...' : '同步雲端資料庫'}</span>
            </button>
          </div>
        )}
      </header>

      {/* 主要內容區塊 */}
      <main className="max-w-7xl mx-auto px-3 sm:px-6 pt-4">
        
        {/* 班別與科目切換卡片 */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-3 sm:p-4 mb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            {/* 班別選擇 */}
            <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 sm:pb-0">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mr-1 shrink-0">班別:</span>
              {CLASSES.map(cls => (
                <button
                  key={cls}
                  onClick={() => setSelectedClass(cls)}
                  className={`px-3 py-1.5 rounded-lg font-bold text-sm transition shrink-0 ${
                    selectedClass === cls 
                      ? 'bg-blue-600 text-white shadow-sm' 
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {cls} 班
                </button>
              ))}
            </div>

            {/* 科目選擇 */}
            <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 sm:pb-0">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mr-1 shrink-0">科目:</span>
              {SUBJECTS.map(subj => (
                <button
                  key={subj}
                  onClick={() => setSelectedSubject(subj)}
                  className={`px-3 py-1.5 rounded-lg font-bold text-sm transition shrink-0 ${
                    selectedSubject === subj 
                      ? 'bg-amber-500 text-white shadow-sm' 
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {subj}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 分頁 Tab */}
        <div className="flex border-b border-slate-200 mb-4 bg-white rounded-t-xl px-2 pt-2">
          <button
            onClick={() => setActiveTab('check')}
            className={`px-4 py-2.5 font-bold text-sm border-b-2 flex items-center space-x-2 transition ${
              activeTab === 'check' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <CheckCircle className="h-4 w-4" />
            <span>1. 點算功課</span>
          </button>
          <button
            onClick={() => setActiveTab('manage')}
            className={`px-4 py-2.5 font-bold text-sm border-b-2 flex items-center space-x-2 transition ${
              activeTab === 'manage' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Edit3 className="h-4 w-4" />
            <span>2. 管理功課 ({filteredHomeworks.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('students')}
            className={`px-4 py-2.5 font-bold text-sm border-b-2 flex items-center space-x-2 transition ${
              activeTab === 'students' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Users className="h-4 w-4" />
            <span>3. 學生名單</span>
          </button>
        </div>

        {/* TAB 1: 點算功課 */}
        {activeTab === 'check' && (
          <div className="space-y-4">
            {/* 功課切換列 + 新增功課按鈕 */}
            <div className="bg-white p-3 sm:p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex-1">
                <label className="block text-xs font-semibold text-slate-500 mb-1">選擇要點算/登記的功課：</label>
                {filteredHomeworks.length > 0 ? (
                  <select 
                    value={selectedHomeworkId} 
                    onChange={(e) => setSelectedHomeworkId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-bold text-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {filteredHomeworks.map(h => (
                      <option key={h.homework_id} value={h.homework_id}>
                        {h.title} (截止日期: {h.due_date || '未設定'})
                      </option>
                    ))}
                  </select>
                ) : (
                  <p className="text-sm text-slate-400 py-1">目前 {selectedClass} 班 {selectedSubject} 科無已發布功課。</p>
                )}
              </div>
              <button 
                onClick={() => setShowAddModal(true)}
                className="flex items-center justify-center space-x-1 bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2.5 rounded-lg text-sm shadow transition shrink-0"
              >
                <Plus className="h-4 w-4" />
                <span>發布新功課</span>
              </button>
            </div>

            {/* 學生點算清單 (手機響應式卡片 / 列表) */}
            {activeHomework ? (
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-3 sm:p-4 bg-slate-100 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h2 className="font-bold text-slate-800 text-base">{activeHomework.title}</h2>
                    <p className="text-xs text-slate-500 flex items-center space-x-2 mt-0.5">
                      <span className="flex items-center"><Calendar className="h-3 w-3 mr-1" /> 繳交日期: {activeHomework.due_date || '未設定'}</span>
                      <span>•</span>
                      <span>滿分: {activeHomework.max_score} 分</span>
                    </p>
                  </div>
                </div>

                <div className="divide-y divide-slate-100">
                  {classStudents.map(student => {
                    const sub = getStudentSubmission(student.student_id);
                    const currentStatus = sub ? sub.status : null;

                    return (
                      <div key={student.student_id} className="p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-slate-50 transition">
                        <div className="flex items-center space-x-3">
                          <span className="w-8 h-8 rounded-full bg-slate-200 text-slate-700 font-bold flex items-center justify-center text-xs shrink-0">
                            {student.seat_no}
                          </span>
                          <div>
                            <p className="font-bold text-slate-800 text-sm">{student.name_zh}</p>
                            <p className="text-xs text-slate-400">{student.student_id}</p>
                          </div>
                        </div>

                        {/* 狀態切換按鈕群 */}
                        <div className="grid grid-cols-2 sm:flex sm:items-center gap-1.5">
                          {Object.entries(STATUS_CONFIG).map(([key, config]) => {
                            const Icon = config.icon;
                            const isSelected = currentStatus === key;

                            return (
                              <button
                                key={key}
                                onClick={() => handleStatusChange(student.student_id, key)}
                                className={`flex items-center justify-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-bold transition border ${
                                  isSelected 
                                    ? `${config.color} border-transparent shadow-sm` 
                                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                                }`}
                              >
                                <Icon className="h-3.5 w-3.5" />
                                <span>{config.label}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                  {classStudents.length === 0 && (
                    <div className="p-8 text-center text-slate-400 text-sm">此班別尚未匯入學生名單。請切換至「3. 學生名單」匯入。</div>
                  )}
                </div>
              </div>
            ) : null}
          </div>
        )}

        {/* TAB 2: 管理功課 (修訂與刪除) */}
        {activeTab === 'manage' && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-slate-800 text-base">【{selectedClass} 班 - {selectedSubject}】功課列表</h2>
              <button 
                onClick={() => setShowAddModal(true)}
                className="flex items-center space-x-1 bg-blue-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold"
              >
                <Plus className="h-4 w-4" />
                <span>新增功課</span>
              </button>
            </div>

            <div className="space-y-3">
              {filteredHomeworks.map(hw => (
                <div key={hw.homework_id} className="p-3 sm:p-4 border border-slate-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50">
                  <div>
                    <h3 className="font-bold text-slate-800 text-sm sm:text-base">{hw.title}</h3>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mt-1">
                      <span className="flex items-center"><Calendar className="h-3.5 w-3.5 mr-1 text-slate-400" /> 繳交日期: <strong className="ml-1 text-slate-700">{hw.due_date || '未設定'}</strong></span>
                      <span>•</span>
                      <span>滿分: {hw.max_score} 分</span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 shrink-0">
                    <button
                      onClick={() => setEditingHomework(hw)}
                      className="flex items-center space-x-1 px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-bold transition"
                    >
                      <Edit3 className="h-3.5 w-3.5 text-blue-600" />
                      <span>修訂</span>
                    </button>
                    <button
                      onClick={() => handleDeleteHomework(hw.homework_id, hw.title)}
                      className="flex items-center space-x-1 px-3 py-1.5 bg-rose-50 border border-rose-200 hover:bg-rose-100 text-rose-600 rounded-lg text-xs font-bold transition"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span>刪除</span>
                    </button>
                  </div>
                </div>
              ))}
              {filteredHomeworks.length === 0 && (
                <p className="text-center text-slate-400 text-sm py-8">暫無功課紀錄。</p>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: 學生名單管理 */}
        {activeTab === 'students' && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 space-y-4">
            <div>
              <h3 className="font-bold text-slate-800 text-sm mb-1">匯入/覆蓋 【{selectedClass} 班】 學生名單</h3>
              <p className="text-xs text-slate-500 mb-2">每行一位學生，格式：`座號 姓名`（例如：`1 陳大文`），可直接從 Excel 複製貼上。</p>
              <textarea 
                rows="5"
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                placeholder={`1\t陳大文\n2\t李小玲\n3\t張子豪`}
                className="w-full border border-slate-300 rounded-lg p-2.5 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button 
                onClick={handleImportStudents}
                className="mt-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2 rounded-lg text-xs shadow transition"
              >
                儲存名單
              </button>
            </div>

            <div className="border-t border-slate-200 pt-3">
              <h4 className="font-bold text-xs text-slate-500 uppercase tracking-wider mb-2">現有 {selectedClass} 班名單 ({classStudents.length} 人)</h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {classStudents.map(s => (
                  <div key={s.student_id} className="p-2 bg-slate-50 rounded border border-slate-200 text-xs flex items-center space-x-2">
                    <span className="font-bold text-slate-500">{s.seat_no}.</span>
                    <span className="font-bold text-slate-800">{s.name_zh}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

      </main>

      {/* 新增功課 彈窗 Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-5 shadow-xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-base text-slate-800">發布新功課 ({selectedClass} 班 - {selectedSubject})</h3>
              <button onClick={() => setShowAddModal(false)}><X className="h-5 w-5 text-slate-400" /></button>
            </div>
            <form onSubmit={handleAddHomework} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">功課名稱</label>
                <input 
                  type="text" required placeholder="例如：第一課 工作紙"
                  value={newTitle} onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">繳交日期 (Due Date)</label>
                <input 
                  type="date" required
                  value={newDueDate} onChange={(e) => setNewDueDate(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">滿分值</label>
                <input 
                  type="number" value={newMaxScore} onChange={(e) => setNewMaxScore(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex justify-end space-x-2 pt-2">
                <button type="button" onClick={() => setShowAddModal(false)} className="px-4 py-2 bg-slate-100 text-slate-600 rounded-lg text-xs font-bold">取消</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold shadow">確認發布</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 修改功課 彈窗 Modal */}
      {editingHomework && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-5 shadow-xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-base text-slate-800">修訂功課資料</h3>
              <button onClick={() => setEditingHomework(null)}><X className="h-5 w-5 text-slate-400" /></button>
            </div>
            <form onSubmit={handleEditHomework} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">功課名稱</label>
                <input 
                  type="text" required
                  value={editingHomework.title} 
                  onChange={(e) => setEditingHomework({ ...editingHomework, title: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">繳交日期 (Due Date)</label>
                <input 
                  type="date" required
                  value={editingHomework.due_date || ''} 
                  onChange={(e) => setEditingHomework({ ...editingHomework, due_date: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">滿分值</label>
                <input 
                  type="number" 
                  value={editingHomework.max_score} 
                  onChange={(e) => setEditingHomework({ ...editingHomework, max_score: Number(e.target.value) })}
                  className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex justify-end space-x-2 pt-2">
                <button type="button" onClick={() => setEditingHomework(null)} className="px-4 py-2 bg-slate-100 text-slate-600 rounded-lg text-xs font-bold">取消</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold shadow">儲存修訂</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}