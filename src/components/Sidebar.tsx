interface SidebarProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
}

export function Sidebar({ activeSection, onSectionChange }: SidebarProps) {
  return (
    <nav className="fixed left-0 top-0 h-screen w-14 bg-white border-r border-slate-200 z-[1000]">
      <div className="py-4 flex flex-col gap-2">
        <button
          className={`flex items-center justify-center p-2 mx-2 border-0 bg-transparent cursor-pointer rounded-lg transition-all duration-300 ease-out hover:bg-slate-100 hover:text-blue-500 hover:scale-105 ${
            activeSection === 'info' ? 'text-blue-500' : 'text-slate-500'
          }`}
          onClick={() => onSectionChange('info')}
          title="About Milo"
        >
          <svg className="w-6 h-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
          </svg>
        </button>
        <button
          className={`flex items-center justify-center p-2 mx-2 border-0 bg-transparent cursor-pointer rounded-lg transition-all duration-300 ease-out hover:bg-slate-100 hover:text-blue-500 hover:scale-105 ${
            activeSection === 'prompts' ? 'text-blue-500' : 'text-slate-500'
          }`}
          onClick={() => onSectionChange('prompts')}
          title="Prompt Settings"
        >
          <svg className="w-6 h-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
          </svg>
        </button>
        <button
          className={`flex items-center justify-center p-2 mx-2 border-0 bg-transparent cursor-pointer rounded-lg transition-all duration-300 ease-out hover:bg-slate-100 hover:text-blue-500 hover:scale-105 ${
            activeSection === 'api' ? 'text-blue-500' : 'text-slate-500'
          }`}
          onClick={() => onSectionChange('api')}
          title="API Settings"
        >
          <svg className="w-6 h-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1721.75 8.25z" />
          </svg>
        </button>
      </div>
    </nav>
  );
}
