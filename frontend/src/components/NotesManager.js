import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  FileText, 
  Tag, 
  Folder,
  Star, 
  Trash2, 
  Edit3,
  Save,
  X,
  Sparkles,
  Brain,
  Clock
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Badge } from './ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import axios from 'axios';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const NotesManager = () => {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFolder, setSelectedFolder] = useState('');
  const [selectedTag, setSelectedTag] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingNote, setEditingNote] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    tags: '',
    folder: 'general',
    type: 'text'
  });

  useEffect(() => {
    fetchNotes();
  }, [searchTerm, selectedFolder, selectedTag]);

  const fetchNotes = async () => {
    try {
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (selectedFolder && selectedFolder !== 'all') params.append('folder', selectedFolder);
      if (selectedTag && selectedTag !== 'all') params.append('tag', selectedTag);
      
      const response = await axios.get(`${API}/notes?${params}`);
      setNotes(response.data.notes || []);
    } catch (error) {
      console.error('Error fetching notes:', error);
      toast.error('Error al cargar notas');
      setNotes([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const noteData = {
        ...formData,
        tags: formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag)
      };

      if (editingNote) {
        await axios.put(`${API}/notes/${editingNote.id}`, noteData);
        toast.success('Nota actualizada exitosamente');
      } else {
        await axios.post(`${API}/notes`, noteData);
        toast.success('Nota creada exitosamente');
      }
      
      setIsDialogOpen(false);
      setEditingNote(null);
      resetForm();
      fetchNotes();
    } catch (error) {
      console.error('Error saving note:', error);
      toast.error('Error al guardar nota');
    }
  };

  const handleEdit = (note) => {
    setEditingNote(note);
    setFormData({
      title: note.title,
      content: note.content,
      tags: note.tags.join(', '),
      folder: note.folder,
      type: note.type
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (noteId) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar esta nota?')) {
      try {
        await axios.delete(`${API}/notes/${noteId}`);
        toast.success('Nota eliminada exitosamente');
        fetchNotes();
      } catch (error) {
        console.error('Error deleting note:', error);
        toast.error('Error al eliminar nota');
      }
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      content: '',
      tags: '',
      folder: 'general',
      type: 'text'
    });
  };

  const handleNewNote = () => {
    resetForm();
    setEditingNote(null);
    setIsDialogOpen(true);
  };

  const allFolders = [...new Set(notes.map(note => note.folder))];
  const allTags = [...new Set(notes.flatMap(note => note.tags))];

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
    <div className="space-y-6 animate-fade-in" data-testid="notes-manager">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Notas Inteligentes</h1>
          <p className="text-slate-600">Captura, organiza y encuentra tus ideas con IA</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={handleNewNote} className="btn-modern" data-testid="create-note-btn">
              <Plus className="w-4 h-4 mr-2" />
              Nueva Nota
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingNote ? 'Editar Nota' : 'Nueva Nota'}
              </DialogTitle>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Título</label>
                  <Input
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Título de la nota"
                    required
                    className="modern-input"
                    data-testid="note-title-input"
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Carpeta</label>
                  <Select value={formData.folder} onValueChange={(value) => setFormData({ ...formData, folder: value })}>
                    <SelectTrigger data-testid="note-folder-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="general">General</SelectItem>
                      <SelectItem value="trabajo">Trabajo</SelectItem>
                      <SelectItem value="personal">Personal</SelectItem>
                      <SelectItem value="ideas">Ideas</SelectItem>
                      <SelectItem value="proyectos">Proyectos</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Contenido</label>
                <Textarea
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  placeholder="Escribe el contenido de tu nota..."
                  required
                  rows={12}
                  className="modern-input resize-none"
                  data-testid="note-content-input"
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Etiquetas</label>
                <Input
                  value={formData.tags}
                  onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                  placeholder="Etiquetas separadas por comas"
                  className="modern-input"
                  data-testid="note-tags-input"
                />
                <p className="text-xs text-slate-500">Ejemplo: trabajo, importante, ideas</p>
              </div>
              
              <div className="flex justify-end gap-3">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsDialogOpen(false)}
                  data-testid="cancel-note-btn"
                >
                  Cancelar
                </Button>
                <Button type="submit" className="btn-modern" data-testid="save-note-btn">
                  <Save className="w-4 h-4 mr-2" />
                  {editingNote ? 'Actualizar' : 'Guardar'} Nota
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <Card className="modern-card">
        <CardContent className="p-6">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar en notas..."
                className="pl-10"
                data-testid="search-notes-input"
              />
            </div>
            
            <div className="flex gap-3">
              <Select value={selectedFolder} onValueChange={setSelectedFolder}>
                <SelectTrigger className="w-40" data-testid="filter-folder-select">
                  <Folder className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Carpeta" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {allFolders.map(folder => (
                    <SelectItem key={folder} value={folder}>
                      {folder.charAt(0).toUpperCase() + folder.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select value={selectedTag} onValueChange={setSelectedTag}>
                <SelectTrigger className="w-40" data-testid="filter-tag-select">
                  <Tag className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Etiqueta" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {allTags.map(tag => (
                    <SelectItem key={tag} value={tag}>
                      {tag}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notes Grid */}
      {notes.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {notes.map((note, index) => (
            <Card key={note.id} className="modern-card hover-lift group transition-all duration-300">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-lg font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-2">
                    {note.title}
                  </CardTitle>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(note)}
                      className="h-8 w-8 p-0 text-slate-500 hover:text-indigo-600"
                      data-testid={`edit-note-${index}`}
                    >
                      <Edit3 className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(note.id)}
                      className="h-8 w-8 p-0 text-slate-500 hover:text-red-600"
                      data-testid={`delete-note-${index}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="pt-0">
                <div className="space-y-4">
                  <p className="text-slate-600 text-sm line-clamp-4">
                    {note.content}
                  </p>
                  
                  {note.ai_summary && (
                    <div className="p-3 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg border border-indigo-100">
                      <div className="flex items-center gap-2 mb-2">
                        <Brain className="w-4 h-4 text-indigo-600" />
                        <span className="text-xs font-semibold text-indigo-700">Resumen IA</span>
                      </div>
                      <p className="text-sm text-indigo-800 line-clamp-3">
                        {note.ai_summary}
                      </p>
                    </div>
                  )}
                  
                  {note.extracted_tasks?.length > 0 && (
                    <div className="p-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-100">
                      <div className="flex items-center gap-2 mb-2">
                        <Sparkles className="w-4 h-4 text-green-600" />
                        <span className="text-xs font-semibold text-green-700">Tareas Extraídas</span>
                      </div>
                      <div className="space-y-1">
                        {note.extracted_tasks.slice(0, 2).map((task, i) => (
                          <p key={i} className="text-sm text-green-800 truncate">
                            • {task}
                          </p>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  <div className="flex flex-wrap gap-2">
                    {note.tags.map((tag, i) => (
                      <Badge key={i} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                    <Badge variant="outline" className="text-xs">
                      {note.folder}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {format(new Date(note.created_date), 'dd MMM yyyy', { locale: es })}
                    </div>
                    {note.is_favorite && (
                      <Star className="w-4 h-4 text-amber-400 fill-current" />
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
            <FileText className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">
              {searchTerm || selectedFolder || selectedTag ? 'No se encontraron notas' : 'No tienes notas aún'}
            </h3>
            <p className="text-slate-600 mb-6">
              {searchTerm || selectedFolder || selectedTag 
                ? 'Prueba ajustando los filtros de búsqueda' 
                : 'Crea tu primera nota para comenzar a organizar tus ideas'}
            </p>
            <Button onClick={handleNewNote} className="btn-modern" data-testid="empty-state-create-btn">
              <Plus className="w-4 h-4 mr-2" />
              Crear Primera Nota
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default NotesManager;