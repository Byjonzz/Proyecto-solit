import React, { useState } from 'react';
import { Phone, Mail, MapPin, Calendar, Briefcase } from 'lucide-react';

const DetallesProspecto = () => {
  const [activeTab, setActiveTab] = useState('information');

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h2 className="text-lg font-bold text-gray-800 mb-4">Detalle del prospecto / lead</h2>

      <div className="flex gap-4 border-b border-gray-200 mb-6">
        {['information', 'segmentation', 'quotes', 'documents', 'material'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 font-medium border-b-2 transition-colors ${
              activeTab === tab
                ? 'text-primary border-primary'
                : 'text-gray-600 border-transparent hover:text-gray-800'
            }`}
          >
            {tab === 'information' && 'Información'}
            {tab === 'segmentation' && 'Segmentación'}
            {tab === 'quotes' && 'Cotizaciones'}
            {tab === 'documents' && 'Documentos'}
            {tab === 'material' && 'Material'}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          {activeTab === 'information' && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <img 
                  src="https://via.placeholder.com/60" 
                  alt="Lead"
                  className="w-16 h-16 rounded-full"
                />
                <div>
                  <h3 className="text-xl font-bold text-gray-800">María Fernández</h3>
                  <p className="text-gray-600">Col. Jardines del Sur</p>
                  <span className="inline-block mt-2 px-3 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full">
                    Interesado
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                <div className="flex items-center gap-3">
                  <Phone className="w-5 h-5 text-primary" />
                  <div>
                    <p className="text-xs text-gray-500">Teléfono</p>
                    <p className="text-gray-800 font-medium">9871234567</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Mail className="w-5 h-5 text-primary" />
                  <div>
                    <p className="text-xs text-gray-500">Email</p>
                    <p className="text-gray-800 font-medium">maria.fer@gmail.com</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <MapPin className="w-5 h-5 text-primary" />
                  <div>
                    <p className="text-xs text-gray-500">Ubicación</p>
                    <p className="text-gray-800 font-medium">Col. Jardines del Sur</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Calendar className="w-5 h-5 text-primary" />
                  <div>
                    <p className="text-xs text-gray-500">Fecha de contacto</p>
                    <p className="text-gray-800 font-medium">19 may 2026, 10:30 AM</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'segmentation' && (
            <div className="space-y-4">
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <p className="text-sm text-blue-800">
                  <strong>Segmento:</strong> Residencial Premium<br/>
                  <strong>Potencial:</strong> Muy Alto<br/>
                  <strong>Interés:</strong> 600 Megas / 500 Megas
                </p>
              </div>
            </div>
          )}

          {activeTab === 'quotes' && (
            <div className="space-y-3">
              <p className="text-sm text-gray-600">No hay cotizaciones registradas</p>
            </div>
          )}

          {activeTab === 'documents' && (
            <div className="space-y-3">
              <p className="text-sm text-gray-600">No hay documentos cargados</p>
            </div>
          )}

          {activeTab === 'material' && (
            <div className="space-y-3">
              <p className="text-sm text-gray-600">Sin material disponible</p>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
            <h4 className="font-semibold text-amber-900 mb-2">Datos del prospecto</h4>
            <div className="text-sm space-y-1 text-amber-800">
              <p><strong>ID Cliente (INE):</strong> 1234567890/23456</p>
              <p><strong>Nombre completo:</strong> María Fernández López García</p>
              <p><strong>Calle:</strong> Bugarambillos</p>
              <p><strong>No.:</strong> 123</p>
              <p><strong>Referencias del distrito:</strong> Casa color blanco con tejido negro, junto a la tienda OXXO</p>
              <p><strong>Teléfono 1 (WhatsApp):</strong> 9872345678</p>
              <p><strong>Correo:</strong> maria.fer@gmail.com</p>
            </div>
          </div>

          <div className="bg-green-50 p-4 rounded-lg border border-green-200">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-green-900">Documentos requeridos</h4>
              <span className="text-xs font-semibold text-green-700">✓</span>
            </div>
            <p className="text-sm text-green-800 mt-2">Recibido del INE</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DetallesProspecto;
