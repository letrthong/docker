import { X, FolderKanban, Plus, ChevronDown, FileText, Folder } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useProject } from '../../contexts/ProjectContext';
import { useAuth } from '../../contexts/AuthContext';
import TreeView from '../documents/TreeView';

function Sidebar({ isOpen, onClose }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAdmin } = useAuth();
  const { projects, fetchProjects, currentProject, selectProject, isLoading, tree } = useProject();
  const [showProjectList, setShowProjectList] = useState(false);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const handleSelectProject = (project) => {
    selectProject(project.id);
    setShowProjectList(false);
    navigate(`/project/${project.id}`);
    if (window.innerWidth < 1024) {
      onClose();
    }
  };

  // Count nodes in tree
  const nodeCount = tree?.nodes ? Object.keys(tree.nodes).length : 0;

  return (
    <>
      {/* Overlay for mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 z-50 h-screen w-80 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 transform transition-transform duration-300 lg:translate-x-0 lg:static lg:h-screen ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full overflow-hidden">
          {/* Logo & Close */}
          <div className="flex items-center justify-between h-16 px-4 border-b border-slate-200 dark:border-slate-800">
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-3 hover:opacity-80 transition"
            >
              <div className="bg-emerald-600 text-white p-2 rounded-lg flex items-center justify-center shadow-md shadow-emerald-200 dark:shadow-none">
                <FileText className="w-5 h-5" />
              </div>
              <div className="text-left">
                <span className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                  Docupedia
                </span>
                <p className="text-[10px] text-slate-400 dark:text-slate-500">Document Manager</p>
              </div>
            </button>
            <button
              onClick={onClose}
              className="lg:hidden p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

{/* Project Selector - Compact */}
          <div className="px-3 py-2 border-b border-slate-200 dark:border-slate-800">
            <div className="relative">
              <button
                onClick={() => setShowProjectList(!showProjectList)}
                className="w-full flex items-center justify-between px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:border-emerald-300 dark:hover:border-emerald-600 transition-all"
              >
                <span className="truncate font-medium text-slate-900 dark:text-white">
                  {currentProject?.name || 'Chọn Project...'}
                </span>
                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${showProjectList ? 'rotate-180' : ''}`} />
              </button>

              {showProjectList && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl max-h-60 overflow-y-auto z-10">
                  {isLoading ? (
                    <div className="px-4 py-3 text-sm text-slate-500 flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-emerald-200 border-t-emerald-600" />
                      Đang tải...
                    </div>
                  ) : projects.length === 0 ? (
                    <div className="px-4 py-3 text-sm text-slate-500">
                      Không có project
                    </div>
                  ) : (
                    projects.map((project) => (
                      <button
                        key={project.id}
                        onClick={() => handleSelectProject(project)}
                        className={`w-full text-left px-4 py-2.5 text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition ${
                          currentProject?.id === project.id
                            ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 font-medium'
                            : 'text-slate-900 dark:text-white'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <FolderKanban className="w-4 h-4 text-slate-400" />
                          {project.name}
                        </div>
                      </button>
                    ))
                  )}
                  
                  {isAdmin && (
                    <>
                      <div className="border-t border-slate-100 dark:border-slate-800" />
                      <button
                        onClick={() => {
                          setShowProjectList(false);
                          navigate('/projects/new');
                        }}
                        className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 font-medium transition"
                      >
                        <Plus className="w-4 h-4" />
                        Tạo Project mới
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Tree View - Maximum Height */}
          <div className="flex-1 overflow-y-auto px-2 py-2" style={{ minHeight: 0 }}>
            {currentProject ? (
              <TreeView />
            ) : (
              <div className="text-center py-8">
                <Folder className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                <p className="text-sm text-slate-400 dark:text-slate-500">Chọn project để xem</p>
              </div>
            )}
          </div>

          {/* Compact Footer */}
          {currentProject && (
            <div className="flex-shrink-0 px-3 py-1.5 border-t border-slate-200 dark:border-slate-800 text-[11px] text-slate-400 dark:text-slate-500 text-center">
              {nodeCount} tài liệu
            </div>
          )}
        </div>
      </aside>
    </>
  );
}

export default Sidebar;
