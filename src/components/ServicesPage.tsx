import React, { useState, useEffect } from 'react';
import * as Icons from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { getSmartVisualThemeConfig } from '../config/industry';

interface ServiceRecord {
  id: number;
  service_name: string;
  category: string;
  base_labor_rate: number;
  base_material_cost: number;
  man_hour_rate: number;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export const ServicesPage: React.FC = () => {
  const { user } = useAuth();
  const { theme } = useTheme();
  const visualConfig = getSmartVisualThemeConfig(theme);
  
  const [services, setServices] = useState<ServiceRecord[]>([
    {
      id: 1,
      service_name: "Paver Patio (SQFT)",
      category: "Hardscaping",
      base_labor_rate: 0.12,
      base_material_cost: 4.50,
      man_hour_rate: 75,
      active: true,
      created_at: "2024-01-15T10:30:00Z",
      updated_at: "2024-01-15T10:30:00Z"
    }
  ]);
  
  const [selectedRecord, setSelectedRecord] = useState<ServiceRecord | null>(null);
  const [showInsertForm, setShowInsertForm] = useState(false);
  const [sortField, setSortField] = useState<keyof ServiceRecord>('id');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [filter, setFilter] = useState('');

  const handleSort = (field: keyof ServiceRecord) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const filteredAndSortedServices = services
    .filter(service => 
      Object.values(service).some(value => 
        value.toString().toLowerCase().includes(filter.toLowerCase())
      )
    )
    .sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];
      const direction = sortDirection === 'asc' ? 1 : -1;
      
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return aVal.localeCompare(bVal) * direction;
      }
      
      return ((aVal as number) - (bVal as number)) * direction;
    });

  const SortIcon = ({ field }: { field: keyof ServiceRecord }) => {
    if (sortField !== field) return <Icons.ChevronsUpDown className="h-4 w-4 ml-1" />;
    return sortDirection === 'asc' 
      ? <Icons.ChevronUp className="h-4 w-4 ml-1" />
      : <Icons.ChevronDown className="h-4 w-4 ml-1" />;
  };

  return (
    <div className="h-full flex flex-col" style={{ backgroundColor: visualConfig.colors.background }}>
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b"
           style={{ borderColor: theme === 'light' ? '#e5e7eb' : '#374151' }}>
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold" style={{ color: visualConfig.colors.text.primary }}>
            Services Database
          </h1>
          <div className="flex items-center gap-2 text-sm" style={{ color: visualConfig.colors.text.secondary }}>
            <Icons.Database className="h-4 w-4" />
            <span>{filteredAndSortedServices.length} records</span>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Filter Input */}
          <div className="relative">
            <Icons.Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4" 
                          style={{ color: visualConfig.colors.text.secondary }} />
            <input
              type="text"
              placeholder="Filter records..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2"
              style={{
                backgroundColor: visualConfig.colors.surface,
                borderColor: theme === 'light' ? '#e5e7eb' : '#374151',
                color: visualConfig.colors.text.primary
              }}
            />
          </div>
          
          {/* Insert Button */}
          <button
            onClick={() => setShowInsertForm(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors"
            style={{
              backgroundColor: visualConfig.colors.primary,
              color: 'white'
            }}
          >
            <Icons.Plus className="h-4 w-4" />
            Insert
          </button>
          
          {/* Sort Button */}
          <button className="flex items-center gap-2 px-4 py-2 border rounded-lg transition-colors"
                  style={{
                    borderColor: theme === 'light' ? '#e5e7eb' : '#374151',
                    color: visualConfig.colors.text.primary
                  }}>
            <Icons.ArrowUpDown className="h-4 w-4" />
            Sort
          </button>
        </div>
      </div>

      {/* Table Container */}
      <div className="flex-1 overflow-auto">
        <table className="w-full">
          <thead style={{ backgroundColor: theme === 'light' ? '#f9fafb' : '#1f2937' }}>
            <tr>
              <th className="p-3 text-left font-medium border-b" 
                  style={{ borderColor: theme === 'light' ? '#e5e7eb' : '#374151' }}>
                <div className="flex items-center">
                  <input type="checkbox" className="mr-3" />
                  <span style={{ color: visualConfig.colors.text.secondary }}>Select</span>
                </div>
              </th>
              
              <th className="p-3 text-left font-medium border-b cursor-pointer hover:bg-opacity-20"
                  style={{ borderColor: theme === 'light' ? '#e5e7eb' : '#374151', color: visualConfig.colors.text.secondary }}
                  onClick={() => handleSort('id')}>
                <div className="flex items-center">
                  id_int4
                  <SortIcon field="id" />
                </div>
              </th>
              
              <th className="p-3 text-left font-medium border-b cursor-pointer hover:bg-opacity-20"
                  style={{ borderColor: theme === 'light' ? '#e5e7eb' : '#374151', color: visualConfig.colors.text.secondary }}
                  onClick={() => handleSort('service_name')}>
                <div className="flex items-center">
                  service_name_varchar
                  <SortIcon field="service_name" />
                </div>
              </th>
              
              <th className="p-3 text-left font-medium border-b cursor-pointer hover:bg-opacity-20"
                  style={{ borderColor: theme === 'light' ? '#e5e7eb' : '#374151', color: visualConfig.colors.text.secondary }}
                  onClick={() => handleSort('category')}>
                <div className="flex items-center">
                  category_varchar
                  <SortIcon field="category" />
                </div>
              </th>
              
              <th className="p-3 text-left font-medium border-b cursor-pointer hover:bg-opacity-20"
                  style={{ borderColor: theme === 'light' ? '#e5e7eb' : '#374151', color: visualConfig.colors.text.secondary }}
                  onClick={() => handleSort('base_labor_rate')}>
                <div className="flex items-center">
                  base_labor_rate_decimal
                  <SortIcon field="base_labor_rate" />
                </div>
              </th>
              
              <th className="p-3 text-left font-medium border-b cursor-pointer hover:bg-opacity-20"
                  style={{ borderColor: theme === 'light' ? '#e5e7eb' : '#374151', color: visualConfig.colors.text.secondary }}
                  onClick={() => handleSort('base_material_cost')}>
                <div className="flex items-center">
                  base_material_cost_decimal
                  <SortIcon field="base_material_cost" />
                </div>
              </th>
              
              <th className="p-3 text-left font-medium border-b cursor-pointer hover:bg-opacity-20"
                  style={{ borderColor: theme === 'light' ? '#e5e7eb' : '#374151', color: visualConfig.colors.text.secondary }}
                  onClick={() => handleSort('active')}>
                <div className="flex items-center">
                  active_boolean
                  <SortIcon field="active" />
                </div>
              </th>
            </tr>
          </thead>
          
          <tbody>
            {filteredAndSortedServices.map((service, index) => (
              <tr key={service.id} 
                  className="hover:bg-opacity-10 transition-colors cursor-pointer"
                  style={{ 
                    backgroundColor: selectedRecord?.id === service.id ? visualConfig.colors.primary + '20' : 'transparent',
                    borderBottom: `1px solid ${theme === 'light' ? '#e5e7eb' : '#374151'}`
                  }}
                  onClick={() => setSelectedRecord(service)}>
                <td className="p-3">
                  <input type="checkbox" 
                         checked={selectedRecord?.id === service.id}
                         onChange={() => setSelectedRecord(service)} />
                </td>
                <td className="p-3" style={{ color: visualConfig.colors.text.primary }}>
                  {service.id}
                </td>
                <td className="p-3" style={{ color: visualConfig.colors.text.primary }}>
                  {service.service_name}
                </td>
                <td className="p-3" style={{ color: visualConfig.colors.text.primary }}>
                  {service.category}
                </td>
                <td className="p-3" style={{ color: visualConfig.colors.text.primary }}>
                  ${service.base_labor_rate.toFixed(2)}/sqft
                </td>
                <td className="p-3" style={{ color: visualConfig.colors.text.primary }}>
                  ${service.base_material_cost.toFixed(2)}/sqft
                </td>
                <td className="p-3">
                  <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    service.active 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    <div className={`w-2 h-2 rounded-full mr-1 ${
                      service.active ? 'bg-green-400' : 'bg-red-400'
                    }`} />
                    {service.active ? 'Active' : 'Inactive'}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Status Bar */}
      <div className="flex items-center justify-between p-3 border-t text-sm"
           style={{ 
             backgroundColor: theme === 'light' ? '#f9fafb' : '#1f2937',
             borderColor: theme === 'light' ? '#e5e7eb' : '#374151',
             color: visualConfig.colors.text.secondary 
           }}>
        <div className="flex items-center gap-4">
          <span>RLS disabled</span>
          <span>Role: {user?.is_admin ? 'admin' : 'user'}</span>
          <span>Enable Realtime</span>
        </div>
        
        <div className="flex items-center gap-2">
          <Icons.RefreshCw className="h-4 w-4" />
          <span>Last updated: {new Date().toLocaleTimeString()}</span>
        </div>
      </div>

      {/* Record Detail Panel (Right Side) */}
      {selectedRecord && (
        <div className="fixed top-0 right-0 w-96 h-full border-l shadow-lg z-40"
             style={{ 
               backgroundColor: visualConfig.colors.surface,
               borderColor: theme === 'light' ? '#e5e7eb' : '#374151'
             }}>
          <div className="flex items-center justify-between p-4 border-b"
               style={{ borderColor: theme === 'light' ? '#e5e7eb' : '#374151' }}>
            <h3 className="text-lg font-semibold" style={{ color: visualConfig.colors.text.primary }}>
              Record Details
            </h3>
            <button onClick={() => setSelectedRecord(null)}
                    className="p-1 rounded hover:bg-opacity-20"
                    style={{ color: visualConfig.colors.text.secondary }}>
              <Icons.X className="h-5 w-5" />
            </button>
          </div>
          
          <div className="p-4 space-y-4">
            {Object.entries(selectedRecord).map(([key, value]) => (
              <div key={key}>
                <label className="block text-sm font-medium mb-1"
                       style={{ color: visualConfig.colors.text.secondary }}>
                  {key.replace(/_/g, ' ').toUpperCase()}
                </label>
                <div className="p-2 border rounded"
                     style={{ 
                       backgroundColor: visualConfig.colors.background,
                       borderColor: theme === 'light' ? '#e5e7eb' : '#374151',
                       color: visualConfig.colors.text.primary
                     }}>
                  {typeof value === 'boolean' ? (value ? 'true' : 'false') : value?.toString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};