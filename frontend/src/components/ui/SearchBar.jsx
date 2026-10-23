import { Search } from 'lucide-react';

const SearchBar = ({ placeholder = "Cari surat atau ayat...", onSearch }) => {
  return (
    <div className="relative w-full group">
      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
        <Search className="h-5 w-5 text-slate-400 group-focus-within:text-emerald-400 transition-colors" />
      </div>
      <input
        type="text"
        className="block w-full pl-11 pr-4 py-3 
          bg-slate-800/50 border border-slate-700 
          rounded-2xl text-slate-200 placeholder-slate-500
          focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500
          focus:bg-slate-800 transition-all shadow-inner"
        placeholder={placeholder}
        onChange={(e) => onSearch && onSearch(e.target.value)}
      />
    </div>
  );
};

export default SearchBar;