import React from 'react';
import { Image, Trash2, Plus } from 'lucide-react';

const Evidence = () => {
  const evidences = [
    { id: 1, title: 'Identificación (INE)', image: 'https://via.placeholder.com/200/cccccc/666666?text=INE', status: '✓' },
    { id: 2, title: 'Recibo del domicilio', image: 'https://via.placeholder.com/200/cccccc/666666?text=Recibo', status: '✓' }
  ];

  return (
    <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
      <h2 className="text-lg font-bold text-gray-800 mb-4">Evidencias</h2>
      
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {evidences.map((evidence) => (
          <div key={evidence.id} className="group relative">
            <div className="bg-gray-100 rounded-lg overflow-hidden aspect-square relative">
              <img 
                src={evidence.image} 
                alt={evidence.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute top-2 right-2 bg-green-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold">
                {evidence.status}
              </div>
              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                <button className="bg-white rounded-full p-2 hover:bg-gray-100">
                  <Trash2 className="w-4 h-4 text-red-600" />
                </button>
              </div>
            </div>
            <p className="text-sm text-gray-700 mt-2 text-center">{evidence.title}</p>
          </div>
        ))}

        <button className="border-2 border-dashed border-gray-300 rounded-lg aspect-square flex flex-col items-center justify-center hover:border-primary hover:bg-primary hover:bg-opacity-5 transition-all group">
          <Plus className="w-6 h-6 text-gray-400 group-hover:text-primary mb-2" />
          <span className="text-xs text-gray-500 group-hover:text-primary text-center">Agregar evidencia</span>
        </button>
      </div>

      <div className="mt-6">
        <h3 className="font-semibold text-gray-800 mb-2">Notas de instalación</h3>
        <textarea
          placeholder="Escribir observaciones..."
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm h-20"
        />
      </div>

      <div className="flex gap-3 mt-6">
        <button className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors">
          Atrás
        </button>
        <button className="px-6 py-2 bg-primary text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors ml-auto">
          Finalizar
        </button>
      </div>
    </div>
  );
};

export default Evidence;
