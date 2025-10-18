import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Upload, 
  FolderOpen, 
  FileText,
  Download,
  Trash2,
  Brain,
  Search,
  File,
  Archive,
  Clock,
  HardDrive,
  CheckCircle,
  AlertCircle,
  Loader
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Progress } from './ui/progress';
import axios from 'axios';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const ProjectsManager = () => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    file: null
  });
  const [dragActive, setDragActive] = useState(false);

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const response = await axios.get(`${API}/projects`);
      setProjects(Array.isArray(response.data) ? response.data : response.data.projects || []);
    } catch (error) {
      console.error('Error fetching projects:', error);
      toast.error('Error al cargar proyectos');
      setProjects([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.file) {
      toast.error('Selecciona un archivo para subir');
      return;
    }

    try {
      const formDataObj = new FormData();
      formDataObj.append('file', formData.file);
      formDataObj.append('name', formData.name);
      formDataObj.append('description', formData.description);

      setUploadProgress(0);
      
      const response = await axios.post(`${API}/projects/upload`, formDataObj, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          const progress = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          setUploadProgress(progress);
        }
      });

      toast.success('Proyecto subido y analizado exitosamente');
      setIsDialogOpen(false);
      resetForm();
      fetchProjects();
    } catch (error) {
      console.error('Error uploading project:', error);
      toast.error(error.response?.data?.detail || 'Error al subir proyecto');
    } finally {
      setUploadProgress(0);
    }
  };

  const handleDelete = async (projectId) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar este proyecto?')) {
      try {
        await axios.delete(`${API}/projects/${projectId}`);
        toast.success('Proyecto eliminado exitosamente');
        fetchProjects();
      } catch (error) {
        console.error('Error deleting project:', error);
        toast.error('Error al eliminar proyecto');
      }
    }
  };

  const handleDownload = async (projectId, fileName) => {
    try {
      toast.info('Descargando archivo...');
      
      const response = await axios.get(`${API}/projects/${projectId}/download`, {
        responseType: 'blob'
      });
      
      // Create blob URL and trigger download
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      toast.success('Archivo descargado exitosamente');
    } catch (error) {
      console.error('Error downloading project:', error);
      toast.error('Error al descargar archivo');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      file: null
    });
  };

  const handleFileSelect = (file) => {
    if (file) {
      // Validate file type
      const allowedTypes = ['.zip', '.pdf', '.docx', '.txt'];
      const fileExtension = '.' + file.name.split('.').pop().toLowerCase();
      
      if (!allowedTypes.includes(fileExtension)) {
        toast.error('Tipo de archivo no soportado. Usa: ZIP, PDF, DOCX, TXT');
        return;
      }
      
      // Validate file size (max 50MB)
      if (file.size > 50 * 1024 * 1024) {
        toast.error('El archivo es muy grande. Máximo 50MB');
        return;
      }
      
      setFormData({
        ...formData,
        file: file,
        name: formData.name || file.name.replace(/\.[^/.]+$/, '')
      });
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'processing':
        return <Loader className="w-5 h-5 text-blue-600 animate-spin" />;
      case 'failed':
        return <AlertCircle className="w-5 h-5 text-red-600" />;
      default:
        return <Clock className="w-5 h-5 text-amber-600" />;
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'completed':
        return 'Completado';
      case 'processing':
        return 'Procesando';
      case 'failed':
        return 'Error';
      default:
        return 'Pendiente';
    }
  };

  const filteredProjects = projects.filter(project =>
    project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    project.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-6 bg-slate-200 rounded mb-4"></div>
                <div className="space-y-2 mb-4">
                  <div className="h-4 bg-slate-200 rounded"></div>
                  <div className="h-4 bg-slate-200 rounded w-4/5"></div>
                </div>
                <div className="flex gap-2">
                  <div className="h-6 bg-slate-200 rounded w-16"></div>
                  <div className="h-6 bg-slate-200 rounded w-20"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in" data-testid="projects-manager">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Gestor de Proyectos</h1>
          <p className="text-slate-600">Sube y analiza tus documentos con IA avanzada</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { resetForm(); setIsDialogOpen(true); }} className="btn-modern" data-testid="upload-project-btn">
              <Upload className="w-4 h-4 mr-2" />
              Subir Proyecto
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Subir Nuevo Proyecto</DialogTitle>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* File Drop Zone */}
              <div 
                className={`border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200 ${
                  dragActive 
                    ? 'border-indigo-500 bg-indigo-50' 
                    : formData.file 
                    ? 'border-green-500 bg-green-50'
                    : 'border-slate-300 hover:border-slate-400 bg-slate-50'
                }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                data-testid="file-drop-zone"
              >
                {formData.file ? (
                  <div className="space-y-3">
                    <div className="w-16 h-16 mx-auto bg-green-100 rounded-xl flex items-center justify-center">
                      <File className="w-8 h-8 text-green-600" />
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">{formData.file.name}</p>
                      <p className="text-sm text-slate-600">{formatFileSize(formData.file.size)}</p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setFormData({ ...formData, file: null })}
                      data-testid="remove-file-btn"
                    >
                      Cambiar archivo
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="w-16 h-16 mx-auto bg-slate-200 rounded-xl flex items-center justify-center">
                      <Upload className="w-8 h-8 text-slate-500" />
                    </div>
                    <div>
                      <p className="text-lg font-medium text-slate-900 mb-2">
                        Arrastra tu archivo aquí o haz clic para seleccionar
                      </p>
                      <p className="text-sm text-slate-600">
                        Soporta: ZIP, PDF, DOCX, TXT (máx. 50MB)
                      </p>
                    </div>
                    <input
                      type="file"
                      accept=".zip,.pdf,.docx,.txt"
                      onChange={(e) => handleFileSelect(e.target.files[0])}
                      className="hidden"
                      id="file-input"
                      data-testid="file-input"
                    />
                    <label htmlFor="file-input">
                      <Button type="button" variant="outline" className="cursor-pointer" data-testid="select-file-btn">
                        Seleccionar archivo
                      </Button>
                    </label>
                  </div>
                )}
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Nombre del proyecto</label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Nombre descriptivo del proyecto"
                  required
                  className="modern-input"
                  data-testid="project-name-input"
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Descripción</label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Descripción del proyecto (opcional)"
                  rows={3}
                  className="modern-input resize-none"
                  data-testid="project-description-input"
                />
              </div>
              
              {uploadProgress > 0 && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Subiendo archivo...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <Progress value={uploadProgress} className="h-2" />
                </div>
              )}
              
              <div className="flex justify-end gap-3">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsDialogOpen(false)}
                  disabled={uploadProgress > 0}
                  data-testid="cancel-upload-btn"
                >
                  Cancelar
                </Button>
                <Button 
                  type="submit" 
                  className="btn-modern" 
                  disabled={!formData.file || uploadProgress > 0}
                  data-testid="submit-project-btn"
                >
                  {uploadProgress > 0 ? (
                    <div className="flex items-center gap-2">
                      <Loader className="w-4 h-4 animate-spin" />
                      Subiendo...
                    </div>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      Subir y Analizar
                    </>
                  )}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <Card className="modern-card">
        <CardContent className="p-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar proyectos..."
              className="pl-10"
              data-testid="search-projects-input"
            />
          </div>
        </CardContent>
      </Card>

      {/* Projects Grid */}
      {filteredProjects.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProjects.map((project, index) => (
            <Card key={project.id} className="modern-card hover-lift group transition-all duration-300">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="w-12 h-12 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center flex-shrink-0">
                      {project.file_path?.includes('.zip') ? (
                        <Archive className="w-6 h-6 text-white" />
                      ) : (
                        <FileText className="w-6 h-6 text-white" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-lg font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-2 mb-2">
                        {project.name}
                      </CardTitle>
                      <div className="flex items-center gap-2 mb-2">
                        {getStatusIcon(project.analysis_status)}
                        <Badge 
                          variant={project.analysis_status === 'completed' ? 'default' : project.analysis_status === 'failed' ? 'destructive' : 'secondary'}
                          className="text-xs"
                        >
                          {getStatusLabel(project.analysis_status)}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDownload(project.id, project.file_name)}
                      className="h-8 w-8 p-0 text-slate-500 hover:text-indigo-600"
                      title="Descargar archivo"
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(project.id)}
                      className="h-8 w-8 p-0 text-slate-500 hover:text-red-600"
                      data-testid={`delete-project-${index}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="pt-0">
                <div className="space-y-4">
                  {project.description && (
                    <p className="text-slate-600 text-sm line-clamp-2">
                      {project.description}
                    </p>
                  )}
                  
                  {/* File Info */}
                  <div className="flex items-center justify-between text-sm text-slate-600 p-3 bg-slate-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <HardDrive className="w-4 h-4" />
                      <span>{formatFileSize(project.file_size)}</span>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      v{project.version}
                    </Badge>
                  </div>
                  
                  {/* AI Analysis Results */}
                  {project.extracted_info?.ai_analysis && (
                    <div className="p-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg border border-indigo-100">
                      <div className="flex items-center gap-2 mb-3">
                        <Brain className="w-4 h-4 text-indigo-600" />
                        <span className="text-sm font-semibold text-indigo-700">Análisis IA</span>
                      </div>
                      
                      {project.extracted_info.ai_analysis.summary && (
                        <div className="mb-3">
                          <p className="text-xs font-medium text-indigo-700 mb-1">Resumen:</p>
                          <p className="text-sm text-indigo-800 line-clamp-3">
                            {project.extracted_info.ai_analysis.summary}
                          </p>
                        </div>
                      )}
                      
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        {project.extracted_info.ai_analysis.tasks?.length > 0 && (
                          <div>
                            <p className="font-medium text-indigo-700 mb-1">Tareas:</p>
                            <p className="text-indigo-600">{project.extracted_info.ai_analysis.tasks.length} encontradas</p>
                          </div>
                        )}
                        {project.extracted_info.ai_analysis.dates?.length > 0 && (
                          <div>
                            <p className="font-medium text-indigo-700 mb-1">Fechas:</p>
                            <p className="text-indigo-600">{project.extracted_info.ai_analysis.dates.length} encontradas</p>
                          </div>
                        )}
                        {project.extracted_info.ai_analysis.contacts?.length > 0 && (
                          <div>
                            <p className="font-medium text-indigo-700 mb-1">Contactos:</p>
                            <p className="text-indigo-600">{project.extracted_info.ai_analysis.contacts.length} encontrados</p>
                          </div>
                        )}
                        {project.extracted_info.ai_analysis.amounts?.length > 0 && (
                          <div>
                            <p className="font-medium text-indigo-700 mb-1">Montos:</p>
                            <p className="text-indigo-600">{project.extracted_info.ai_analysis.amounts.length} encontrados</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {/* File List for ZIP files */}
                  {project.extracted_info?.files && (
                    <div className="p-3 bg-slate-50 rounded-lg">
                      <p className="text-sm font-medium text-slate-700 mb-2">Archivos ({project.extracted_info.files.length}):</p>
                      <div className="space-y-1 max-h-32 overflow-y-auto">
                        {project.extracted_info.files.slice(0, 5).map((file, i) => (
                          <p key={i} className="text-xs text-slate-600 truncate" title={file}>
                            {file}
                          </p>
                        ))}
                        {project.extracted_info.files.length > 5 && (
                          <p className="text-xs text-slate-500">+{project.extracted_info.files.length - 5} archivos más</p>
                        )}
                      </div>
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {format(new Date(project.created_date), 'dd MMM yyyy', { locale: es })}
                    </div>
                    {project.analysis_status === 'completed' && (
                      <Badge variant="secondary" className="text-xs">
                        ✓ Analizado
                      </Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="modern-card">
          <CardContent className="text-center py-12">
            <FolderOpen className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">
              {searchTerm ? 'No se encontraron proyectos' : 'No tienes proyectos aún'}
            </h3>
            <p className="text-slate-600 mb-6">
              {searchTerm 
                ? 'Prueba ajustando el término de búsqueda' 
                : 'Sube tu primer proyecto para comenzar el análisis con IA'}
            </p>
            <Button 
              onClick={() => { resetForm(); setIsDialogOpen(true); }} 
              className="btn-modern" 
              data-testid="empty-state-upload-btn"
            >
              <Upload className="w-4 h-4 mr-2" />
              Subir Primer Proyecto
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ProjectsManager;