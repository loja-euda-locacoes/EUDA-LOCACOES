import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { doc, getDoc, setDoc, updateDoc, collection } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../lib/firebase';
import { Product } from '../../types';
import { Save, Trash2, Camera, Sparkles, Wand2, Link as LinkIcon, ExternalLink, Video } from 'lucide-react';
import { cn, getDriveDirectLink } from '../../lib/utils';
import { generateProductDetails } from '../../services/geminiService';
import { useNotification } from '../../context/NotificationContext';

export function ProductForm() {
  const { notify } = useNotification();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(!!id);
  const [driveLink, setDriveLink] = useState('');
  const [videoDriveLink, setVideoDriveLink] = useState('');
  
  const [formData, setFormData] = useState<Partial<Product>>({
    name: '',
    description: '',
    price: 0,
    measurements: '',
    recommendations: '',
    images: [],
    videoUrl: '',
    mostWanted: false,
    category: 'Adulto',
  });

  const [isGenerating, setIsGenerating] = useState(false);

  const handleMagicFill = async () => {
    if (!formData.name) {
      notify('Por favor, insira o nome do vestido primeiro.', 'warning');
      return;
    }

    setIsGenerating(true);
    try {
      const details = await generateProductDetails(formData.name);
      setFormData(prev => ({
        ...prev,
        description: details.description,
        measurements: details.measurements,
        recommendations: details.recommendations,
      }));
    } catch (err) {
      console.error('Error generating details:', err);
      notify('Ocorreu um erro ao gerar os detalhes. Tente novamente.', 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  useEffect(() => {
    if (id) {
      const fetchProduct = async () => {
        try {
          const docRef = doc(db, 'products', id);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const data = docSnap.data();
            setFormData(prev => ({
              ...prev,
              ...data,
              name: data.name || '',
              description: data.description || '',
              price: data.price || 0,
              measurements: data.measurements || '',
              recommendations: data.recommendations || '',
              videoUrl: data.videoUrl || '',
              category: data.category || 'Adulto',
              mostWanted: !!data.mostWanted,
              images: data.images || [],
            }));
          }
        } catch (err) {
          console.error(err);
          notify('Erro ao carregar produto.', 'error');
        } finally {
          setFetching(false);
        }
      };
      fetchProduct();
    }
  }, [id, notify]);

  const extractDriveId = (url: string) => {
    const regex = /\/d\/([a-zA-Z0-9_-]+)|id=([a-zA-Z0-9_-]+)/;
    const match = url.match(regex);
    return match ? (match[1] || match[2]) : null;
  };

  const handleAddDriveImage = (e: React.FormEvent) => {
    e.preventDefault();
    const directUrl = getDriveDirectLink(driveLink);
    
    if (directUrl === driveLink && driveLink.includes('drive.google.com')) {
      notify('URL do Google Drive inválida. Certifique-se de que o link contém um ID de arquivo.', 'error');
      return;
    }

    setFormData(prev => ({
      ...prev,
      images: [...(prev.images || []), directUrl]
    }));
    setDriveLink('');
    notify('Imagem adicionada com sucesso!', 'success');
  };

  const handleAddDriveVideo = (e: React.FormEvent) => {
    e.preventDefault();
    const driveId = extractDriveId(videoDriveLink);
    
    if (!driveId) {
      notify('URL do vídeo do Google Drive inválida.', 'error');
      return;
    }

    // Direct preview link for iframe
    const previewUrl = `https://drive.google.com/file/d/${driveId}/preview`;
    
    setFormData(prev => ({
      ...prev,
      videoUrl: previewUrl
    }));
    setVideoDriveLink('');
    notify('Vídeo adicionado com sucesso!', 'success');
  };

  const removeImage = (index: number) => {
    const newImages = [...(formData.images || [])];
    newImages.splice(index, 1);
    setFormData({ ...formData, images: newImages });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.images?.length) {
      notify('Por favor, preencha o nome e adicione pelo menos uma imagem.', 'warning');
      return;
    }

    setLoading(true);
    try {
      const productData = {
        ...formData,
        updatedAt: new Date().toISOString(),
      };

      if (id) {
        await updateDoc(doc(db, 'products', id), productData);
      } else {
        const newDocRef = doc(collection(db, 'products'));
        await setDoc(newDocRef, {
          ...productData,
          id: newDocRef.id,
          createdAt: new Date().toISOString(),
        });
      }
      notify(id ? 'Produto atualizado com sucesso!' : 'Produto criado com sucesso!', 'success');
      navigate('/admin/produtos');
    } catch (err) {
      handleFirestoreError(err, id ? OperationType.UPDATE : OperationType.CREATE, id ? `products/${id}` : 'products');
      notify('Ocorreu um erro ao salvar o produto.', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (fetching) return null;

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm space-y-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between px-1">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Nome do Vestido</label>
                <button
                  type="button"
                  onClick={handleMagicFill}
                  disabled={isGenerating || !formData.name}
                  className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-brand-orange hover:text-brand-red transition-colors disabled:opacity-30"
                >
                  {isGenerating ? (
                    <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Wand2 size={12} />
                  )}
                  Auto-Completar com IA
                </button>
              </div>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full bg-gray-50 border-2 border-transparent focus:border-brand-orange/30 focus:bg-white rounded-2xl p-4 transition-all"
                placeholder="Ex: Noiva do Sertão"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1">Descrição</label>
              <textarea
                rows={4}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full bg-gray-50 border-2 border-transparent focus:border-brand-orange/30 focus:bg-white rounded-2xl p-4 transition-all"
                placeholder="Conte a história deste vestido..."
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1">Valor do Aluguel (R$)</label>
                <input
                  type="number"
                  required
                  step="0.01"
                  value={formData.price === undefined || Number.isNaN(formData.price) ? '' : formData.price}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    setFormData({ ...formData, price: Number.isNaN(val) ? 0 : val });
                  }}
                  className="w-full bg-gray-50 border-2 border-transparent focus:border-brand-orange/30 focus:bg-white rounded-2xl p-4 transition-all"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1">Categoria</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full bg-gray-50 border-2 border-transparent focus:border-brand-orange/30 focus:bg-white rounded-2xl p-4 transition-all"
                >
                  <option value="Adulto">Adulto</option>
                  <option value="Infantil">Infantil</option>
                  <option value="Noiva">Noiva</option>
                  <option value="Destaque">Destaque</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1">Medidas (Manual)</label>
                <input
                  type="text"
                  value={formData.measurements}
                  onChange={(e) => setFormData({ ...formData, measurements: e.target.value })}
                  className="w-full bg-gray-50 border-2 border-transparent focus:border-brand-orange/30 focus:bg-white rounded-2xl p-4 transition-all"
                  placeholder="Ex: Busto 90, Cintura 70"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1">Recomendações</label>
                <input
                  type="text"
                  value={formData.recommendations}
                  onChange={(e) => setFormData({ ...formData, recommendations: e.target.value })}
                  className="w-full bg-gray-50 border-2 border-transparent focus:border-brand-orange/30 focus:bg-white rounded-2xl p-4 transition-all"
                  placeholder="Ex: Altura ideal até 1.70m"
                />
              </div>
            </div>
            
            <label className="flex items-center gap-3 cursor-pointer group pt-4">
              <input
                type="checkbox"
                className="w-6 h-6 rounded-lg text-brand-orange focus:ring-brand-orange border-gray-100 bg-gray-50"
                checked={formData.mostWanted}
                onChange={(e) => setFormData({ ...formData, mostWanted: e.target.checked })}
              />
              <span className="text-sm font-bold text-gray-600 group-hover:text-brand-orange transition-colors">Marcar como "Mais Procurado"</span>
            </label>
          </div>
        </div>

        {/* Media */}
        <div className="space-y-6">
          <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-gray-50 pb-4">
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-widest">Google Drive Fotos</h3>
              <a 
                href="https://drive.google.com" 
                target="_blank" 
                rel="noreferrer"
                className="text-[10px] font-black uppercase tracking-widest text-[#4285F4] flex items-center gap-1 hover:underline"
              >
                Abrir Drive <ExternalLink size={10} />
              </a>
            </div>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {formData.images?.map((url, i) => (
                  <div key={url} className="relative aspect-[3/4] rounded-2xl overflow-hidden group">
                    <img 
                      src={getDriveDirectLink(url)} 
                      className="w-full h-full object-cover" 
                      alt="" 
                      referrerPolicy="no-referrer" 
                    />
                    <button
                      type="button"
                      onClick={() => removeImage(i)}
                      className="absolute top-2 right-2 bg-red-500 text-white p-2 rounded-xl opacity-0 group-hover:opacity-100 transition-all shadow-lg"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>

              <div className="bg-gray-50 p-4 rounded-2xl border-2 border-dashed border-gray-100 space-y-3">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center">
                  Cole o link de compartilhamento
                </p>
                <div className="flex gap-2 text-sm bg-white p-1 rounded-xl shadow-sm border border-gray-100 focus-within:border-brand-orange/30 transition-all">
                  <input
                    type="text"
                    value={driveLink}
                    onChange={(e) => setDriveLink(e.target.value)}
                    placeholder="Cole o link aqui..."
                    className="flex-1 px-3 py-2 outline-none text-xs"
                  />
                  <button
                    type="button"
                    onClick={handleAddDriveImage}
                    className="bg-brand-orange text-white p-2 rounded-lg hover:bg-brand-red transition-all"
                  >
                    <LinkIcon size={16} />
                  </button>
                </div>
                <p className="text-[9px] text-gray-400 italic text-center leading-relaxed">
                  * Certifique-se de que o arquivo esteja compartilhado como "Qualquer pessoa com o link pode ler".
                </p>
              </div>

              {/* Video Section */}
              <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100 space-y-3">
                <div className="flex items-center gap-2 text-blue-500">
                  <Video size={14} />
                  <span className="text-[10px] font-black uppercase tracking-widest">Vídeo do Produto</span>
                </div>
                
                {formData.videoUrl ? (
                  <div className="relative aspect-video rounded-xl overflow-hidden bg-black group">
                    <iframe 
                      src={formData.videoUrl} 
                      className="w-full h-full" 
                      allow="autoplay"
                      title="Product Video"
                    />
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, videoUrl: '' })}
                      className="absolute top-2 right-2 bg-red-500 text-white p-2 rounded-xl opacity-0 group-hover:opacity-100 transition-all shadow-lg"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex gap-2 text-sm bg-white p-1 rounded-xl shadow-sm border border-blue-100 focus-within:border-blue-500/30 transition-all">
                      <input
                        type="text"
                        value={videoDriveLink}
                        onChange={(e) => setVideoDriveLink(e.target.value)}
                        placeholder="Link do vídeo no Drive..."
                        className="flex-1 px-3 py-2 outline-none text-xs"
                      />
                      <button
                        type="button"
                        onClick={handleAddDriveVideo}
                        className="bg-blue-500 text-white p-2 rounded-lg hover:bg-blue-600 transition-all"
                      >
                        <LinkIcon size={16} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-brand-red text-white py-5 rounded-3xl font-bold shadow-xl shadow-brand-red/20 hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-3"
          >
            {loading ? (
              <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <Save size={20} />
                {id ? 'Atualizar Produto' : 'Salvar Produto'}
              </>
            )}
          </button>
        </div>
      </div>
    </form>
  );
}
