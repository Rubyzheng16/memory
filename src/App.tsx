/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BookOpen, 
  History, 
  Settings, 
  CheckCircle2, 
  XCircle, 
  ChevronRight, 
  Trash2, 
  Upload,
  RotateCcw,
  Info,
  Library,
  Book as BookIcon,
  Plus
} from 'lucide-react';
import { Word, DailyLog, AppSettings, ViewMode, WordBook } from './types';

// --- Constants & Defaults ---
const DEFAULT_SETTINGS: AppSettings = {
  newWordsPerDay: 10,
};

const SAMPLE_DATA = `palace | 宫殿 | Fishbourne Roman Palace is in West Sussex. | 菲什伯恩罗马宫殿位于西萨塞克斯郡。
mosaic | 马赛克 | There were fifty mosaic floors in the palace. | 宫殿里有五十块马赛克地板。
excavation | 发掘 | Cunliffe excavated the site in 1960. | 坎利夫于1960年发掘了该遗址。
wing | 翼 | The north wing was destroyed by fire. | 北翼被火灾摧毁。
colonnade | 柱廊 | The palace had four wings with colonnaded fronts. | 宫殿有四个带有柱廊正面的翼楼。
remains | 遗迹 | A museum was built to preserve the remains. | 建立了一座博物馆来保存遗迹。
abandon | 废弃 | The palace was abandoned after the fire. | 宫殿在火灾后被废弃。
governor | 总督 | Lucullus was a Roman governor of Britain. | 卢库鲁斯是罗马驻不列颠总督。
inscription | 铭文 | An inscription was found in Chichester. | 在奇切斯特发现了一块铭文。
theory | 理论 | There are a number of theories about the owner. | 关于主人有许多理论。`;

// --- Utility Functions ---
const getTodayStr = () => new Date().toISOString().split('T')[0];

const getDaysDiff = (d1: string, d2: string) => {
  const date1 = new Date(d1);
  const date2 = new Date(d2);
  return Math.floor((date2.getTime() - date1.getTime()) / (1000 * 60 * 60 * 24));
};

export default function App() {
  // --- State ---
  const [words, setWords] = useState<Word[]>([]);
  const [logs, setLogs] = useState<DailyLog[]>([]);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [view, setView] = useState<ViewMode>('home');
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  
  // Learning State
  const [todayQueue, setTodayQueue] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isRevealed, setIsRevealed] = useState(false);
  const [completedToday, setCompletedToday] = useState<string[]>([]);
  const [importText, setImportText] = useState('');
  const [importBookName, setImportBookName] = useState('');
  const [editingWord, setEditingWord] = useState<Word | null>(null);
  const [wordBooks, setWordBooks] = useState<WordBook[]>([]);
  const [selectedBookId, setSelectedBookId] = useState<string | null>(null);

  // --- Persistence ---
  useEffect(() => {
    const savedWords = localStorage.getItem('wf_words');
    const savedLogs = localStorage.getItem('wf_logs');
    const savedSettings = localStorage.getItem('wf_settings');
    const savedBooks = localStorage.getItem('wf_books');

    if (savedWords) setWords(JSON.parse(savedWords));
    if (savedLogs) setLogs(JSON.parse(savedLogs));
    if (savedSettings) setSettings(JSON.parse(savedSettings));
    if (savedBooks) setWordBooks(JSON.parse(savedBooks));
  }, []);

  useEffect(() => {
    localStorage.setItem('wf_words', JSON.stringify(words));
    localStorage.setItem('wf_logs', JSON.stringify(logs));
    localStorage.setItem('wf_settings', JSON.stringify(settings));
    localStorage.setItem('wf_books', JSON.stringify(wordBooks));
  }, [words, logs, settings, wordBooks]);

  // --- Learning Engine ---
  const generateTodayQueue = () => {
    const today = getTodayStr();
    
    // 1. Unfamiliar words from last 7 days (100% appearance)
    const unfamiliarReview = words.filter(w => {
      if (w.status !== 'unfamiliar' || !w.lastLearnedDate) return false;
      const diff = getDaysDiff(w.lastLearnedDate, today);
      return diff > 0 && diff <= 7;
    });

    // 2. Familiar words based on probability
    const familiarReview = words.filter(w => {
      if (w.status !== 'familiar' || !w.lastLearnedDate) return false;
      const diff = getDaysDiff(w.lastLearnedDate, today);
      if (diff <= 0 || diff > 7) return false;
      
      let prob = 0;
      if (diff === 1) prob = 0.8;
      else if (diff === 2) prob = 0.6;
      else if (diff === 3) prob = 0.4;
      else if (diff >= 4 && diff <= 7) prob = 0.2;
      
      return Math.random() < prob;
    });

    // 3. New words
    const newWords = words
      .filter(w => w.status === 'new')
      .slice(0, settings.newWordsPerDay);

    const combined = [
      ...unfamiliarReview.map(w => w.id),
      ...familiarReview.map(w => w.id),
      ...newWords.map(w => w.id)
    ];

    // Shuffle
    const shuffled = combined.sort(() => Math.random() - 0.5);
    setTodayQueue(shuffled);
    setCurrentIndex(0);
    setIsRevealed(false);
    setCompletedToday([]);
  };

  // Initialize today's queue if empty and we are on home
  useEffect(() => {
    if (view === 'home' && todayQueue.length === 0 && words.length > 0) {
      generateTodayQueue();
    }
  }, [view, words.length]);

  // --- Handlers ---
  const handleImport = (text: string, name: string) => {
    if (!name.trim()) {
      alert('请输入词书名称');
      return;
    }
    const lines = text.split('\n').filter(l => l.trim());
    const newWords: Word[] = lines.map((line, i) => {
      const [word, trans, ex, exTrans] = line.split('|').map(s => s.trim());
      return {
        id: `w-${Date.now()}-${i}`,
        text: word || 'Unknown',
        translation: trans || '',
        example: ex || '',
        exampleTranslation: exTrans || '',
        status: 'new',
        familiarCount: 0
      };
    });

    const newBook: WordBook = {
      id: `b-${Date.now()}`,
      name: name.trim(),
      wordIds: newWords.map(w => w.id),
      createdAt: new Date().toISOString()
    };

    setWords(prev => [...prev, ...newWords]);
    setWordBooks(prev => [...prev, newBook]);
    setImportText('');
    setImportBookName('');
    alert(`词书《${name}》导入成功！`);
  };

  const handleDeleteBook = (bookId: string) => {
    if (confirm('确定要删除这本词书吗？其中的单词也将被移除。')) {
      const book = wordBooks.find(b => b.id === bookId);
      if (book) {
        setWords(prev => prev.filter(w => !book.wordIds.includes(w.id)));
        setWordBooks(prev => prev.filter(b => b.id !== bookId));
        if (selectedBookId === bookId) setSelectedBookId(null);
        setView('books');
      }
    }
  };

  const handleDeleteWord = (id: string) => {
    if (confirm('确定要删除这个单词吗？')) {
      setWords(prev => prev.filter(w => w.id !== id));
      setTodayQueue(prev => prev.filter(wordId => wordId !== id));
      setEditingWord(null);
    }
  };

  const handleUpdateWord = (updated: Word) => {
    setWords(prev => prev.map(w => w.id === updated.id ? updated : w));
    setEditingWord(null);
  };

  const handleDecision = (isFamiliar: boolean) => {
    const wordId = todayQueue[currentIndex];
    const today = getTodayStr();

    setWords(prev => prev.map(w => {
      if (w.id === wordId) {
        const isFirstTime = !w.lastLearnedDate;
        return {
          ...w,
          status: isFamiliar ? 'familiar' : 'unfamiliar',
          lastLearnedDate: today,
          firstLearnedDate: w.firstLearnedDate || today,
          familiarCount: isFamiliar ? w.familiarCount + 1 : w.familiarCount
        };
      }
      return w;
    }));

    // Update Logs
    setLogs(prev => {
      const existingLog = prev.find(l => l.date === today);
      const otherLogs = prev.filter(l => l.date !== today);
      
      const currentLog: DailyLog = existingLog || {
        date: today,
        learnedWordIds: [],
        familiarWordIds: [],
        unfamiliarWordIds: []
      };

      if (!currentLog.learnedWordIds.includes(wordId)) {
        currentLog.learnedWordIds.push(wordId);
      }

      if (isFamiliar) {
        currentLog.familiarWordIds = [...new Set([...currentLog.familiarWordIds, wordId])];
        currentLog.unfamiliarWordIds = currentLog.unfamiliarWordIds.filter(id => id !== wordId);
      } else {
        currentLog.unfamiliarWordIds = [...new Set([...currentLog.unfamiliarWordIds, wordId])];
      }

      return [...otherLogs, currentLog];
    });

    if (isFamiliar) {
      setCompletedToday(prev => [...prev, wordId]);
      if (currentIndex < todayQueue.length - 1) {
        setCurrentIndex(prev => prev + 1);
      } else {
        // Finished all words in queue
        setCurrentIndex(prev => prev + 1);
      }
    } else {
      // Move to end of queue
      setTodayQueue(prev => {
        const newQueue = [...prev];
        const [current] = newQueue.splice(currentIndex, 1);
        newQueue.push(current);
        return newQueue;
      });
      // Stay at current index (which is now the next word)
    }
    setIsRevealed(false);
  };

  const currentWord = todayQueue[currentIndex] ? words.find(w => w.id === todayQueue[currentIndex]) : null;

  // --- Views ---
  const renderHome = () => {
    if (words.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center h-[60vh] p-8 text-center">
          <BookOpen className="w-16 h-16 text-stone-300 mb-4" />
          <h2 className="text-xl font-bold text-stone-800 mb-2">词库空空如也</h2>
          <p className="text-stone-500 mb-6">前往设置页面导入你的第一个词库吧！</p>
          <button 
            onClick={() => setView('settings')}
            className="bg-brand-5 text-white px-6 py-2 rounded-full font-medium shadow-lg active:scale-95 transition-transform"
          >
            去导入
          </button>
        </div>
      );
    }

    if (currentIndex >= todayQueue.length && todayQueue.length > 0) {
      return (
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center justify-center h-[60vh] p-8 text-center"
        >
          <div className="w-20 h-20 bg-brand-2 rounded-full flex items-center justify-center mb-6">
            <CheckCircle2 className="w-10 h-10 text-brand-5" />
          </div>
          <h2 className="text-2xl font-bold text-stone-800 mb-2">今日任务达成！</h2>
          <p className="text-stone-500 mb-8">你已经完成了今日所有的单词学习和复习。</p>
          <div className="grid grid-cols-2 gap-4 w-full max-w-xs">
            <div className="bg-white p-4 rounded-2xl border border-stone-200">
              <div className="text-xs text-stone-400 uppercase font-bold tracking-wider mb-1">已学</div>
              <div className="text-2xl font-bold text-stone-800">{completedToday.length}</div>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-stone-200">
              <div className="text-xs text-stone-400 uppercase font-bold tracking-wider mb-1">剩余</div>
              <div className="text-2xl font-bold text-stone-800">0</div>
            </div>
          </div>
        </motion.div>
      );
    }

    const isFirstTime = currentWord && !currentWord.lastLearnedDate;
    const shouldShowAll = isFirstTime || isRevealed;

    return (
      <div className="flex flex-col min-h-full p-4">
        {/* Progress Header */}
        <div className="flex items-center justify-between mb-8 px-2 shrink-0">
          <div className="flex flex-col">
            <span className="text-xs font-bold text-stone-400 uppercase tracking-widest">今日进度</span>
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-black text-stone-900">{completedToday.length}</span>
              <span className="text-stone-300 font-medium">/ {todayQueue.length}</span>
            </div>
          </div>
          <div className="h-12 w-12 rounded-full border-4 border-stone-100 flex items-center justify-center relative">
            <svg className="absolute inset-0 w-full h-full -rotate-90">
              <circle
                cx="24" cy="24" r="20"
                fill="none"
                stroke="currentColor"
                strokeWidth="4"
                className="text-brand-5"
                strokeDasharray={125.6}
                strokeDashoffset={125.6 - (125.6 * (completedToday.length / (todayQueue.length || 1)))}
                strokeLinecap="round"
              />
            </svg>
            <span className="text-[10px] font-bold text-stone-500">
              {Math.round((completedToday.length / (todayQueue.length || 1)) * 100)}%
            </span>
          </div>
        </div>

        {/* Word Card */}
        <div className="flex-1 flex flex-col items-center justify-center">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentWord?.id}
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -20, opacity: 0 }}
              onClick={() => !shouldShowAll && setIsRevealed(true)}
              className={`w-full max-w-sm bg-white rounded-[2.5rem] p-8 shadow-xl shadow-stone-200/50 border border-stone-100 flex flex-col items-center text-center min-h-[320px] cursor-pointer transition-all ${!shouldShowAll ? 'hover:scale-[1.02]' : ''}`}
            >
              <h1 className="text-5xl font-black text-stone-900 mb-8 tracking-tight">
                {currentWord?.text}
              </h1>
              
              <div className="w-full space-y-6">
                {shouldShowAll ? (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-6"
                  >
                    <div className="h-px w-12 bg-stone-100 mx-auto" />
                    <p className="text-2xl font-bold text-brand-5">
                      {currentWord?.translation}
                    </p>
                    <div className="space-y-2 px-4">
                      <p className="text-stone-600 italic leading-relaxed text-lg">
                        "{currentWord?.example}"
                      </p>
                      {currentWord?.exampleTranslation && (
                        <p className="text-stone-400 text-sm">
                          {currentWord.exampleTranslation}
                        </p>
                      )}
                    </div>
                  </motion.div>
                ) : (
                  <div className="flex flex-col items-center gap-2 py-8">
                    <div className="w-10 h-10 rounded-full bg-stone-50 flex items-center justify-center">
                      <Info className="w-5 h-5 text-stone-300" />
                    </div>
                    <p className="text-stone-300 font-medium text-sm">点击查看释义</p>
                  </div>
                )}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Action Buttons */}
        <div className="mt-12 grid grid-cols-2 gap-4 pb-8">
          <button
            onClick={() => handleDecision(false)}
            className="flex flex-col items-center justify-center gap-2 bg-white border-2 border-rose-100 text-rose-500 py-4 rounded-3xl font-bold shadow-lg shadow-rose-500/5 active:scale-95 transition-all"
          >
            <XCircle className="w-6 h-6" />
            <span>不熟悉</span>
          </button>
          <button
            onClick={() => handleDecision(true)}
            className="flex flex-col items-center justify-center gap-2 bg-brand-5 text-white py-4 rounded-3xl font-bold shadow-lg shadow-brand-5/20 active:scale-95 transition-all"
          >
            <CheckCircle2 className="w-6 h-6" />
            <span>熟悉</span>
          </button>
        </div>
      </div>
    );
  };

  const renderHistory = () => {
    const sortedLogs = [...logs].sort((a, b) => b.date.localeCompare(a.date));

    if (selectedDate) {
      const log = logs.find(l => l.date === selectedDate);
      return (
        <div className="p-6">
          <button 
            onClick={() => setSelectedDate(null)}
            className="flex items-center gap-2 text-stone-400 font-bold text-sm mb-6 hover:text-stone-600"
          >
            <ChevronRight className="w-4 h-4 rotate-180" />
            返回列表
          </button>
          <h2 className="text-2xl font-black text-stone-900 mb-6">{selectedDate} 复习</h2>
          <div className="space-y-3">
            {log?.learnedWordIds.map(id => {
              const word = words.find(w => w.id === id);
              return (
                <div key={id} className="bg-white p-4 rounded-2xl border border-stone-100 shadow-sm flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-lg font-bold text-stone-800">{word?.text}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                        log.familiarWordIds.includes(id) ? 'bg-brand-2 text-brand-5' : 'bg-rose-50 text-rose-600'
                      }`}>
                        {log.familiarWordIds.includes(id) ? '熟悉' : '不熟悉'}
                      </span>
                    </div>
                    <p className="text-stone-500 text-sm">{word?.translation}</p>
                  </div>
                  <button 
                    onClick={() => setEditingWord(word || null)}
                    className="p-2 text-stone-300 hover:text-brand-5 transition-colors"
                  >
                    <Settings className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      );
    }

    return (
      <div className="p-6">
        <h2 className="text-3xl font-black text-stone-900 mb-8">学习历史</h2>
        {sortedLogs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-stone-300">
            <History className="w-12 h-12 mb-4 opacity-20" />
            <p className="font-bold">暂无学习记录</p>
          </div>
        ) : (
          <div className="space-y-4">
            {sortedLogs.map(log => (
              <button
                key={log.date}
                onClick={() => setSelectedDate(log.date)}
                className="w-full bg-white p-5 rounded-3xl border border-stone-100 shadow-sm flex items-center justify-between active:scale-[0.98] transition-transform"
              >
                <div className="text-left">
                  <div className="text-lg font-black text-stone-800">{log.date}</div>
                  <div className="text-xs font-bold text-stone-400 mt-1">
                    学习了 {log.learnedWordIds.length} 个单词
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex -space-x-2">
                    <div className="w-8 h-8 rounded-full bg-brand-2 border-2 border-white flex items-center justify-center text-[10px] font-bold text-brand-5">
                      {log.familiarWordIds.length}
                    </div>
                    <div className="w-8 h-8 rounded-full bg-rose-50 border-2 border-white flex items-center justify-center text-[10px] font-bold text-rose-600">
                      {log.unfamiliarWordIds.length}
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-stone-200" />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderBooks = () => {
    return (
      <div className="p-6 pb-24">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-3xl font-black text-stone-900">我的词书</h2>
          <button 
            onClick={() => setView('settings')}
            className="p-2 bg-brand-5 text-white rounded-full shadow-lg active:scale-95 transition-transform"
          >
            <Plus className="w-6 h-6" />
          </button>
        </div>

        {wordBooks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-stone-300">
            <Library className="w-12 h-12 mb-4 opacity-20" />
            <p className="font-bold">还没有词书，去导入吧</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {wordBooks.map(book => (
              <button
                key={book.id}
                onClick={() => { setSelectedBookId(book.id); setView('book_detail'); }}
                className="w-full bg-white p-6 rounded-[2rem] border border-stone-100 shadow-sm flex items-center justify-between active:scale-[0.98] transition-transform"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-brand-2 rounded-2xl flex items-center justify-center">
                    <BookIcon className="w-6 h-6 text-brand-5" />
                  </div>
                  <div className="text-left">
                    <div className="text-lg font-black text-stone-800">{book.name}</div>
                    <div className="text-xs font-bold text-stone-400 mt-0.5">
                      {book.wordIds.length} 个单词
                    </div>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-stone-200" />
              </button>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderBookDetail = () => {
    const book = wordBooks.find(b => b.id === selectedBookId);
    if (!book) return null;

    return (
      <div className="p-6 pb-24">
        <div className="flex items-center justify-between mb-6">
          <button 
            onClick={() => setView('books')}
            className="flex items-center gap-2 text-stone-400 font-bold text-sm hover:text-stone-600"
          >
            <ChevronRight className="w-4 h-4 rotate-180" />
            返回
          </button>
          <button 
            onClick={() => handleDeleteBook(book.id)}
            className="text-rose-400 p-2"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
        
        <div className="mb-8">
          <h2 className="text-3xl font-black text-stone-900">{book.name}</h2>
          <p className="text-stone-400 text-sm font-bold mt-1">共 {book.wordIds.length} 个单词</p>
        </div>

        <div className="space-y-3">
          {book.wordIds.map(id => {
            const word = words.find(w => w.id === id);
            if (!word) return null;
            return (
              <div 
                key={id} 
                onClick={() => setEditingWord(word)}
                className="bg-white p-5 rounded-3xl border border-stone-100 shadow-sm flex items-center justify-between active:bg-stone-50 transition-colors"
              >
                <div>
                  <div className="text-lg font-bold text-stone-800">{word.text}</div>
                  <div className="text-stone-500 text-sm mt-0.5">{word.translation}</div>
                </div>
                <ChevronRight className="w-4 h-4 text-stone-200" />
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderSettings = () => {

    return (
      <div className="p-6 space-y-10 pb-24">
        <h2 className="text-3xl font-black text-stone-900">设置</h2>
        
        <section className="space-y-4">
          <label className="block text-xs font-black text-stone-400 uppercase tracking-widest">每日新词数量</label>
          <div className="flex items-center gap-4">
            <input 
              type="range" min="5" max="50" step="5"
              value={settings.newWordsPerDay}
              onChange={(e) => setSettings(s => ({ ...s, newWordsPerDay: parseInt(e.target.value) }))}
              className="flex-1 accent-brand-5"
            />
            <span className="text-xl font-black text-stone-800 w-8">{settings.newWordsPerDay}</span>
          </div>
        </section>

        <section className="space-y-4">
          <label className="block text-xs font-black text-stone-400 uppercase tracking-widest">导入词库</label>
          <div className="space-y-3">
            <input 
              type="text"
              placeholder="词书名称（如：雅思核心词）"
              className="w-full bg-white border border-stone-200 rounded-2xl p-4 focus:outline-none focus:border-brand-5 text-stone-800 font-bold"
              value={importBookName}
              onChange={(e) => setImportBookName(e.target.value)}
            />
            <div className="bg-white rounded-3xl border border-stone-200 p-4 shadow-inner">
              <textarea 
                placeholder="格式：单词 | 中文 | 例句 | 例句翻译"
                className="w-full h-40 bg-transparent resize-none focus:outline-none text-stone-600 font-mono text-sm leading-relaxed"
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <button 
              onClick={() => {
                setImportText(SAMPLE_DATA);
                setImportBookName('示例词书');
              }}
              className="bg-stone-100 text-stone-600 py-3 rounded-2xl font-bold text-sm active:scale-95 transition-transform"
            >
              使用示例数据
            </button>
            <button 
              onClick={() => handleImport(importText, importBookName)}
              className="bg-brand-5 text-white py-3 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-brand-5/20 active:scale-95 transition-transform"
            >
              <Upload className="w-4 h-4" />
              立即导入
            </button>
          </div>
          <p className="text-[10px] text-stone-400 leading-relaxed">
            * 导入新词库将作为一本新词书加入，不会覆盖已有数据。
          </p>
        </section>

        <section className="pt-6 border-t border-stone-100 space-y-4">
          <button 
            onClick={() => {
              if (confirm('确定要清除所有数据吗？此操作不可撤销。')) {
                setWords([]);
                setLogs([]);
                setWordBooks([]);
                localStorage.clear();
                window.location.reload();
              }
            }}
            className="w-full flex items-center justify-center gap-2 text-rose-500 font-bold py-4 rounded-2xl bg-rose-50 active:scale-95 transition-transform"
          >
            <Trash2 className="w-5 h-5" />
            清除所有数据
          </button>
          
          <button 
            onClick={() => generateTodayQueue()}
            className="w-full flex items-center justify-center gap-2 text-stone-500 font-bold py-4 rounded-2xl bg-stone-100 active:scale-95 transition-transform"
          >
            <RotateCcw className="w-5 h-5" />
            重置今日学习队列
          </button>
        </section>
      </div>
    );
  };

  const renderEditModal = () => {
    if (!editingWord) return null;
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-stone-900/40 backdrop-blur-sm">
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-white w-full max-w-sm rounded-[2rem] p-6 shadow-2xl space-y-4"
        >
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xl font-black text-stone-800">编辑单词</h3>
            <button onClick={() => setEditingWord(null)} className="text-stone-300 hover:text-stone-500">
              <XCircle className="w-6 h-6" />
            </button>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest block mb-1">单词</label>
              <input 
                type="text" 
                className="w-full bg-stone-50 border border-stone-100 rounded-xl p-3 focus:outline-none focus:border-brand-5"
                value={editingWord.text}
                onChange={e => setEditingWord({...editingWord, text: e.target.value})}
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest block mb-1">翻译</label>
              <input 
                type="text" 
                className="w-full bg-stone-50 border border-stone-100 rounded-xl p-3 focus:outline-none focus:border-brand-5"
                value={editingWord.translation}
                onChange={e => setEditingWord({...editingWord, translation: e.target.value})}
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest block mb-1">例句</label>
              <textarea 
                className="w-full bg-stone-50 border border-stone-100 rounded-xl p-3 focus:outline-none focus:border-brand-5 h-20 resize-none"
                value={editingWord.example}
                onChange={e => setEditingWord({...editingWord, example: e.target.value})}
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest block mb-1">例句翻译</label>
              <textarea 
                className="w-full bg-stone-50 border border-stone-100 rounded-xl p-3 focus:outline-none focus:border-brand-5 h-20 resize-none"
                value={editingWord.exampleTranslation}
                onChange={e => setEditingWord({...editingWord, exampleTranslation: e.target.value})}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-4">
            <button 
              onClick={() => handleDeleteWord(editingWord.id)}
              className="flex items-center justify-center gap-2 text-rose-500 font-bold py-3 rounded-2xl bg-rose-50 active:scale-95 transition-transform"
            >
              <Trash2 className="w-4 h-4" />
              删除
            </button>
            <button 
              onClick={() => handleUpdateWord(editingWord)}
              className="bg-brand-5 text-white py-3 rounded-2xl font-bold shadow-lg shadow-brand-5/20 active:scale-95 transition-transform"
            >
              保存修改
            </button>
          </div>
        </motion.div>
      </div>
    );
  };

  return (
    <div className="h-screen flex flex-col max-w-md mx-auto bg-brand-1 overflow-hidden relative">
      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto pb-24">
        <AnimatePresence mode="wait">
          <motion.div
            key={view + (selectedDate || '') + (selectedBookId || '')}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="h-full"
          >
            {view === 'home' && renderHome()}
            {view === 'history' && renderHistory()}
            {view === 'books' && renderBooks()}
            {view === 'book_detail' && renderBookDetail()}
            {view === 'settings' && renderSettings()}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Edit Modal */}
      {renderEditModal()}

      {/* Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white/90 backdrop-blur-xl border-t border-stone-100 safe-bottom z-40">
        <div className="flex items-center justify-around h-20 px-4">
          <button 
            onClick={() => { setView('home'); setSelectedDate(null); setSelectedBookId(null); }}
            className={`flex flex-col items-center gap-1 transition-all ${view === 'home' ? 'text-brand-5 scale-110' : 'text-stone-300'}`}
          >
            <BookOpen className={`w-6 h-6 ${view === 'home' ? 'fill-brand-5/10' : ''}`} />
            <span className="text-[10px] font-black uppercase tracking-widest">学习</span>
          </button>
          <button 
            onClick={() => { setView('books'); setSelectedDate(null); setSelectedBookId(null); }}
            className={`flex flex-col items-center gap-1 transition-all ${['books', 'book_detail'].includes(view) ? 'text-brand-5 scale-110' : 'text-stone-300'}`}
          >
            <Library className={`w-6 h-6 ${['books', 'book_detail'].includes(view) ? 'fill-brand-5/10' : ''}`} />
            <span className="text-[10px] font-black uppercase tracking-widest">词书</span>
          </button>
          <button 
            onClick={() => { setView('history'); setSelectedDate(null); setSelectedBookId(null); }}
            className={`flex flex-col items-center gap-1 transition-all ${view === 'history' ? 'text-brand-5 scale-110' : 'text-stone-300'}`}
          >
            <History className={`w-6 h-6 ${view === 'history' ? 'fill-brand-5/10' : ''}`} />
            <span className="text-[10px] font-black uppercase tracking-widest">历史</span>
          </button>
          <button 
            onClick={() => { setView('settings'); setSelectedDate(null); setSelectedBookId(null); }}
            className={`flex flex-col items-center gap-1 transition-all ${view === 'settings' ? 'text-brand-5 scale-110' : 'text-stone-300'}`}
          >
            <Settings className={`w-6 h-6 ${view === 'settings' ? 'fill-brand-5/10' : ''}`} />
            <span className="text-[10px] font-black uppercase tracking-widest">设置</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
