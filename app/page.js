'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  BookOpen, Users, CheckCircle, Clock, AlertCircle, 
  XCircle, Plus, Cloud, CloudOff, RefreshCw, Download, 
  UserPlus, FileSpreadsheet, Check, Trash2, Edit3
} from 'lucide-react';

const STATUS_CONFIG = {
  SUBMITTED: { label: '已繳交', color: 'bg-emerald-500 text-white', icon: CheckCircle },
  PENDING: { label: '未交', color: 'bg-slate-200 text-slate-700', icon: Clock },
  MISSING: { label: '欠交', color: 'bg-rose-500 text-white', icon: XCircle },
  LATE: { label: '遲交', color: 'bg-amber-500 text-white', icon: AlertCircle },
  ABSENT: { label: '缺席', color: 'bg-purple-500 text-white', icon: Users }
};

export default function HomeworkApp() {
  // 選單與切換狀態
  const [selectedSubject, setSelectedSubject] = useState('中國語文');
  const [selectedClass, setSelectedClass] = useState('1A');
  const [selectedHwId, setSelectedHwId] = useState('');

  // 系統數據庫 state
  const [students, setStudents] = useState([]);
  const [homeworks, setHomeworks] = useState([]);
  const [submissions, setSubmissions] = useState({});

  // UI 狀態
  const [activeTab, setActiveTab] = useState('tracking'); // 'tracking' | 'grading' | 'roster'
  const [isOnline, setIsOnline] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showNewHwModal, setShowNewHwModal] = useState(false);

  // 表單數據：出功課
  const [newHwTitle, setNewHwTitle] = useState('');
  const [maxScore, setMaxScore] = useState(100);

  // 表單數據：匯入學生名單 Textarea
  const [importText, setImportText] = useState('');
  const [importSuccessMsg, setImportSuccessMsg] = useState('');

  // 1. 初始化讀取 LocalStorage
  useEffect(() => {
    setIsOnline(navigator.onLine);
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const localStudents = localStorage.getItem('hk_hw_students');
    const localHws = localStorage.getItem('hk_hw_list');
    const localSubs = localStorage.getItem('hk_hw_subs');

    if (localStudents) {
      setStudents(JSON.parse(localStudents));
    } else {
      // 預設示範學生
      const demoStudents = [
        { student_id: '1A_01', class_name: '1A', seat_no: 1, student_num: '2026001', name_zh: '陳大文' },
        { student_id: '1A_02', class_name: '1A', seat_no: 2, student_num: '2026002', name_zh: '張小明' },
        { student_id: '1A_03', class_name: '1A', seat_no: 3, student_num: '2026003', name_zh: '李詠詩' },
        { student_id: '1B_01', class_name: '1B', seat_no: 1, student_num: '2026051', name_zh: '黃家豪' }
      ];
      setStudents(demoStudents);
    }

    if (localHws) {
      const parsedHws = JSON.parse(localHws);
      setHomeworks(parsedHws);
      if (parsedHws.length > 0) setSelectedHwId(parsedHws[0].homework_id);
    } else {
      const demoHw = {
        homework_id: 'HW_001',
        subject_name: '中國語文',
        class_name: '1A',
        title: '單元一 詞語工作紙',
        max_score: 100,
        created_at: new Date().toISOString()
      };
      setHomeworks([demoHw]);
      setSelectedHwId('HW_001');
    }

    if (localSubs) setSubmissions(JSON.parse(localSubs));

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // 持久化儲存至 LocalStorage
  useEffect(() => {
    localStorage.setItem('hk_hw_students', JSON.stringify(students));
    localStorage.setItem('hk_hw_list', JSON.stringify(homeworks));
    localStorage.setItem('hk_hw_subs', JSON.stringify(submissions));
  }, [students, homeworks, submissions]);

  // 目前班別的學生列表
  const currentStudents = useMemo(() => {
    return students
      .filter(s => s.class_name === selectedClass)
      .sort((a, b) => Number(a.seat_no) - Number(b.seat_no));
  }, [students, selectedClass]);

  // 目前選取的功課
  const currentHw = useMemo(() => {
    return homeworks.find(h => h.homework_id === selectedHwId) || homeworks[0];
  }, [homeworks, selectedHwId]);

  // 統計數據計算
  const stats = useMemo(() => {
    if (!currentHw) return { total: 0, submitted: 0, rate: 0, avg: 0 };
    const hwSubs = currentStudents.map(s => submissions[`${currentHw.homework_id}_${s.student_id}`] || {});
    const total = currentStudents.length;
    const submitted = hwSubs.filter(s => s.status === 'SUBMITTED' || s.status === 'LATE').length;
    const scores = hwSubs.map(s => Number(s.score)).filter(s => !isNaN(s) && s > 0);
    const avg = scores.length > 0 ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1) : 0;

    return {
      total,
      submitted,
      rate: total > 0 ? Math.round((submitted / total) * 100) : 0,
      avg
    };
  }, [currentHw, currentStudents, submissions]);

  // 切換學生點算狀態
  const handleStatusChange = (studentId, newStatus) => {
    if (!currentHw) return;
    const key = `${currentHw.homework_id}_${studentId}`;
    setSubmissions(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        submission_id: key,
        homework_id: currentHw.homework_id,
        student_id: studentId,
        status: newStatus,
        submitted_at: new Date().toISOString()
      }
    }));
  };

  // 一鍵全選已交
  const handleSelectAllSubmitted = () => {
    if (!currentHw) return;
    const updated = { ...submissions };
    currentStudents.forEach(student => {
      const key = `${currentHw.homework_id}_${student.student_id}`;
      if (!updated[key] || updated[key].status === 'PENDING') {
        updated[key] = {
          submission_id: key,
          homework_id: currentHw.homework_id,
          student_id: student.student_id,
          status: 'SUBMITTED',
          submitted_at: new Date().toISOString()
        };
      }
    });
    setSubmissions(updated);
  };

  // 更新分數與評語
  const handleScoreChange = (studentId, score, feedback) => {
    if (!currentHw) return;
    const key = `${currentHw.homework_id}_${studentId}`;
    setSubmissions(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        score,
        feedback
      }
    }));
  };

  // 解析與匯入學生名單 (文字剪貼簿 / CSV)
  const handleImportRoster = (e) => {
    e.preventDefault();
    if (!importText.trim()) return;

    // 解析每一行：格式可以是 "座號 學號 姓名" 或 "座號 姓名"
    const lines = importText.trim().split('\n');
    const parsedStudents = [];

    lines.forEach((line, idx) => {
      // 支援 Tab (\t) 或 多重空格分隔
      const parts = line.split(/[\t,]+/).map(p => p.trim()).filter(Boolean);
      if (parts.length >= 2) {
        let seat_no = parseInt(parts[0], 10) || (idx + 1);
        let student_num = parts.length >= 3 ? parts[1] : '';
        let name_zh = parts.length >= 3 ? parts[2] : parts[1];

        parsedStudents.push({
          student_id: `${selectedClass}_${String(seat_no).padStart(2, '0')}`,
          class_name: selectedClass,
          seat_no,
          student_num,
          name_zh
        });
      }
    });

    if (parsedStudents.length === 0) {
      alert('無法解析名單，請確認格式為「座號  姓名」或「座號  學號  姓名」');
      return;
    }

    // 更新 local state：保留其他班學生，替換當前班別學生
    setStudents(prev => [
      ...prev.filter(s => s.class_name !== selectedClass),
      ...parsedStudents
    ]);

    setImportText('');
    setImportSuccessMsg(`成功匯入 ${parsedStudents.length} 位學生至 ${selectedClass} 班！`);
    setTimeout(() => setImportSuccessMsg(''), 4000);
  };

  // 新增功課
  const handleCreateHomework = (e) => {
    e.preventDefault();
    if (!newHwTitle.trim()) return;

    const newHw = {
      homework_id: `HW_${Date.now()}`,
      subject_name: selectedSubject,
      class_name: selectedClass,
      title: newHwTitle,
      max_score: maxScore,
      created_at: new Date().toISOString()
    };

    setHomeworks([newHw, ...homeworks]);
    setSelectedHwId(newHw.homework_id);
    setNewHwTitle('');
    setShowNewHwModal(false);
  };

  // 匯出 CSV 報告
  const handleExportCSV = () => {
    if (!currentHw) return;
    let csvContent = "data:text/csv;charset=utf-8,\uFEFF";
    csvContent += "座號,學號,姓名,繳交狀態,分數,評語,點算時間\n";

    currentStudents.forEach(s => {
      const sub = submissions[`${currentHw.homework_id}_${s.student_id}`] || {};
      const statusLabel = STATUS_CONFIG[sub.status || 'PENDING'].label;
      csvContent += `${s.seat_no},${s.student_num || ''},${s.name_zh},${statusLabel},${sub.score || ''},"${sub.feedback || ''}",${sub.submitted_at || ''}\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${selectedClass}_${currentHw.title}_功課報告.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-12">
      {/* 頁首 Header */}
      <header className="bg-indigo-700 text-white shadow-md sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <BookOpen className="w-7 h-7 text-indigo-200" />
            <h1 className="text-xl font-bold tracking-tight">功課 Master (HK)</h1>
          </div>
          
          <div className="flex items-center space-x-3 text-xs">
            <span className={`flex items-center gap-1 px-2.5 py-1 rounded-full font-medium ${isOnline ? 'bg-emerald-600' : 'bg-amber-600'}`}>
              {isOnline ? <Cloud className="w-3.5 h-3.5" /> : <CloudOff className="w-3.5 h-3.5" />}
              {isOnline ? '在線' : '離線暫存'}
            </span>
            <button 
              onClick={() => { setIsSyncing(true); setTimeout(() => setIsSyncing(false), 800); }}
              className="p-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 transition active:scale-95"
              title="即時同步至雲端"
            >
              <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* 快速切換「科目」與「班別」列 */}
        <div className="bg-indigo-800 px-4 py-2 border-t border-indigo-600">
          <div className="max-w-5xl mx-auto flex flex-wrap gap-2 items-center justify-between">
            <div className="flex items-center space-x-2">
              <select 
                value={selectedSubject} 
                onChange={e => setSelectedSubject(e.target.value)}
                className="bg-indigo-900 text-white text-sm font-medium rounded-lg px-3 py-1.5 border border-indigo-500 focus:ring-2 focus:ring-amber-400 focus:outline-none"
              >
                {['歷史', '公經社', '公民與社會發展'].map(s => <option key={s} value={s}>{s}</option>)}
              </select>

              <select 
                value={selectedClass} 
                onChange={e => setSelectedClass(e.target.value)}
                className="bg-indigo-900 text-white text-sm font-medium rounded-lg px-3 py-1.5 border border-indigo-500 focus:ring-2 focus:ring-amber-400 focus:outline-none"
              >
                {['1A', '1B', '1C', '2A', '2C', '3A', '3D', '5D', '6A'].map(c => <option key={c} value={c}>{c} 班</option>)}
              </select>
            </div>

            <button 
              onClick={() => setShowNewHwModal(true)}
              className="flex items-center gap-1 bg-amber-400 hover:bg-amber-300 text-indigo-950 px-3 py-1.5 rounded-lg font-semibold text-xs shadow transition active:scale-95"
            >
              <Plus className="w-4 h-4" /> 出功課
            </button>
          </div>
        </div>
      </header>

      {/* 主體內容 */}
      <main className="max-w-5xl mx-auto px-4 mt-4 space-y-4">
        
        {/* 功課選擇區與統計指標 */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="w-full md:w-auto">
              <label className="text-xs text-slate-500 font-semibold block mb-1">當前功課項目：</label>
              <select 
                value={selectedHwId} 
                onChange={e => setSelectedHwId(e.target.value)}
                className="w-full md:w-80 text-base font-bold text-slate-800 bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500"
              >
                {homeworks
                  .filter(h => h.subject_name === selectedSubject && h.class_name === selectedClass)
                  .map(h => <option key={h.homework_id} value={h.homework_id}>{h.title}</option>)
                }
              </select>
            </div>

            {/* 統計數值 */}
            <div className="flex items-center gap-6 w-full md:w-auto justify-around bg-slate-50 px-4 py-2.5 rounded-lg border border-slate-100">
              <div className="text-center">
                <span className="text-xs text-slate-500 block">全班人數</span>
                <span className="text-base font-bold text-slate-700">{currentStudents.length} 人</span>
              </div>
              <div className="h-7 w-px bg-slate-200" />
              <div className="text-center">
                <span className="text-xs text-slate-500 block">收齊率</span>
                <span className="text-base font-black text-indigo-600">{stats.submitted} 人 ({stats.rate}%)</span>
              </div>
              <div className="h-7 w-px bg-slate-200" />
              <div className="text-center">
                <span className="text-xs text-slate-500 block">平均分</span>
                <span className="text-base font-black text-emerald-600">{stats.avg} 分</span>
              </div>
            </div>
          </div>

          {/* 功能頁籤與動作選項 */}
          <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
            <div className="flex space-x-1 bg-slate-100 p-1 rounded-lg">
              <button 
                onClick={() => setActiveTab('tracking')}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition ${activeTab === 'tracking' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600'}`}
              >
                📋 1. 快速點算
              </button>
              <button 
                onClick={() => setActiveTab('grading')}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition ${activeTab === 'grading' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600'}`}
              >
                ✍️ 2. 登分 / 評語
              </button>
              <button 
                onClick={() => setActiveTab('roster')}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition ${activeTab === 'roster' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600'}`}
              >
                👥 3. 學生名單管理
              </button>
            </div>

            <div className="flex gap-2">
              {activeTab === 'tracking' && (
                <button 
                  onClick={handleSelectAllSubmitted}
                  className="text-xs bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-300 font-medium px-3 py-1.5 rounded-lg transition"
                >
                  一鍵全選已交
                </button>
              )}
              <button 
                onClick={handleExportCSV}
                className="flex items-center gap-1 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 font-medium px-2.5 py-1.5 rounded-lg transition"
              >
                <Download className="w-3.5 h-3.5" /> 匯出 CSV
              </button>
            </div>
          </div>
        </div>

        {/* 頁籤 1：流動裝置大觸控點算介面 */}
        {activeTab === 'tracking' && (
          currentStudents.length === 0 ? (
            <div className="bg-white rounded-xl p-8 text-center text-slate-500 border border-dashed border-slate-300">
              <Users className="w-12 h-12 mx-auto mb-2 text-slate-300" />
              <p className="font-semibold">{selectedClass} 班暫無學生名單</p>
              <p className="text-xs text-slate-400 mt-1">請切換至「3. 學生名單管理」分頁進行匯入。</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {currentStudents.map(student => {
                const subKey = `${currentHw?.homework_id}_${student.student_id}`;
                const currentStatus = submissions[subKey]?.status || 'PENDING';

                return (
                  <div key={student.student_id} className="bg-white p-3.5 rounded-xl shadow-sm border border-slate-200 flex flex-col justify-between">
                    <div className="flex justify-between items-center mb-2">
                      <div className="flex items-center space-x-2">
                        <span className="w-7 h-7 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center text-xs font-bold">
                          {student.seat_no}
                        </span>
                        <span className="font-bold text-slate-800 text-base">{student.name_zh}</span>
                      </div>
                      {student.student_num && <span className="text-xs text-slate-400">#{student.student_num}</span>}
                    </div>

                    {/* 大觸控按鈕 */}
                    <div className="grid grid-cols-5 gap-1 mt-1">
                      {Object.entries(STATUS_CONFIG).map(([statusKey, config]) => {
                        const isSelected = currentStatus === statusKey;
                        return (
                          <button
                            key={statusKey}
                            onClick={() => handleStatusChange(student.student_id, statusKey)}
                            className={`py-2 px-1 rounded-lg text-xs font-bold transition flex flex-col items-center justify-center gap-1 ${
                              isSelected 
                                ? config.color + ' ring-2 ring-offset-1 ring-indigo-500 shadow-sm scale-105 z-10' 
                                : 'bg-slate-50 text-slate-500 hover:bg-slate-100 border border-slate-200'
                            }`}
                          >
                            <config.icon className="w-4 h-4" />
                            <span className="scale-90">{config.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )
        )}

        {/* 頁籤 2：登分與評語介面 */}
        {activeTab === 'grading' && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600">
                    <th className="p-3 w-16 text-center">座號</th>
                    <th className="p-3 w-28">姓名</th>
                    <th className="p-3 w-28">狀態</th>
                    <th className="p-3 w-32">分數 (滿分 {currentHw?.max_score})</th>
                    <th className="p-3">評語 / 備註</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {currentStudents.map(student => {
                    const subKey = `${currentHw?.homework_id}_${student.student_id}`;
                    const sub = submissions[subKey] || {};
                    const statusConfig = STATUS_CONFIG[sub.status || 'PENDING'];

                    return (
                      <tr key={student.student_id} className="hover:bg-slate-50 transition">
                        <td className="p-3 text-center font-bold text-slate-500">{student.seat_no}</td>
                        <td className="p-3 font-semibold text-slate-800">{student.name_zh}</td>
                        <td className="p-3">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${statusConfig.color}`}>
                            {statusConfig.label}
                          </span>
                        </td>
                        <td className="p-3">
                          <input 
                            type="number"
                            min="0"
                            max={currentHw?.max_score || 100}
                            placeholder="0-100"
                            value={sub.score || ''}
                            onChange={e => handleScoreChange(student.student_id, e.target.value, sub.feedback)}
                            className="w-20 px-2 py-1 border border-slate-300 rounded focus:ring-2 focus:ring-indigo-500 focus:outline-none font-medium"
                          />
                        </td>
                        <td className="p-3">
                          <input 
                            type="text"
                            placeholder="例如：字跡潦草、需重做"
                            value={sub.feedback || ''}
                            onChange={e => handleScoreChange(student.student_id, sub.score, e.target.value)}
                            className="w-full px-2 py-1 border border-slate-200 rounded focus:ring-2 focus:ring-indigo-500 focus:outline-none text-slate-700"
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 頁籤 3：學生名單匯入與管理介面 */}
        {activeTab === 'roster' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            {/* 匯入區域 */}
            <div className="md:col-span-1 bg-white p-4 rounded-xl shadow-sm border border-slate-200 space-y-3">
              <div className="flex items-center space-x-2 text-indigo-700 border-b pb-2">
                <UserPlus className="w-5 h-5" />
                <h3 className="font-bold text-base">匯入 {selectedClass} 班學生名單</h3>
              </div>

              {importSuccessMsg && (
                <div className="bg-emerald-50 text-emerald-700 p-2.5 rounded-lg text-xs font-medium flex items-center gap-1.5">
                  <Check className="w-4 h-4 text-emerald-600" />
                  {importSuccessMsg}
                </div>
              )}

              <form onSubmit={handleImportRoster} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    貼上 Excel / 文字內容：
                  </label>
                  <p className="text-[11px] text-slate-400 mb-2">
                    直接複製 Excel / WebSAMS 資料（每一行格式為：`座號  學號  姓名` 或 `座號  姓名`）：
                  </p>
                  <textarea 
                    rows={8}
                    required
                    placeholder={`1\t2026001\t陳大文\n2\t2026002\t張小明\n3\t2026003\t李詠詩`}
                    value={importText}
                    onChange={e => setImportText(e.target.value)}
                    className="w-full text-xs font-mono p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                <button 
                  type="submit" 
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs py-2 px-3 rounded-lg shadow transition"
                >
                  覆蓋並儲存名單
                </button>
              </form>
            </div>

            {/* 現有學生名單預覽 Table */}
            <div className="md:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden p-4">
              <h3 className="font-bold text-slate-800 text-sm mb-3">
                {selectedClass} 班目前名單（共 {currentStudents.length} 人）
              </h3>

              {currentStudents.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-8">左側尚未匯入學生資料。</p>
              ) : (
                <div className="max-h-96 overflow-y-auto border rounded-lg">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 text-slate-600 sticky top-0">
                      <tr>
                        <th className="p-2 w-12 text-center">座號</th>
                        <th className="p-2 w-28">學號</th>
                        <th className="p-2">中文姓名</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {currentStudents.map(s => (
                        <tr key={s.student_id} className="hover:bg-slate-50">
                          <td className="p-2 text-center font-bold text-slate-500">{s.seat_no}</td>
                          <td className="p-2 font-mono text-slate-500">{s.student_num || '-'}</td>
                          <td className="p-2 font-semibold text-slate-800">{s.name_zh}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

          </div>
        )}

      </main>

      {/* 出功課 Modal */}
      {showNewHwModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-5 space-y-4">
            <h2 className="text-lg font-bold text-slate-800 border-b pb-2">發佈新功課</h2>
            <form onSubmit={handleCreateHomework} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">科目 / 班別</label>
                <div className="text-sm font-bold text-indigo-700 bg-indigo-50 p-2 rounded">
                  {selectedSubject} ({selectedClass} 班)
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">功課名稱</label>
                <input 
                  type="text" 
                  required
                  placeholder="例如：單元一 詞語工作紙"
                  value={newHwTitle}
                  onChange={e => setNewHwTitle(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">滿分值</label>
                <input 
                  type="number" 
                  value={maxScore}
                  onChange={e => setMaxScore(Number(e.target.value))}
                  className="w-full border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button 
                  type="button" 
                  onClick={() => setShowNewHwModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  取消
                </button>
                <button 
                  type="submit" 
                  className="px-4 py-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow"
                >
                  確定發佈
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}