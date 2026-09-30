import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import styles from '../styles/Home.module.css';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function Home() {
  const [clients, setClients] = useState([]);
  const [filteredClients, setFilteredClients] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [currentClient, setCurrentClient] = useState(null);
  const [pointsToAdd, setPointsToAdd] = useState(1);
  const [addingPoints, setAddingPoints] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editData, setEditData] = useState({ nombre: '', telefono: '' });
  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('clientes_puntos')
        .select('*')
        .order('nombre', { ascending: true });

      if (error) throw error;
      setClients(data || []);
      setFilteredClients(data || []);
    } catch (error) {
      console.error('Error fetching clients:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    const term = e.target.value.toLowerCase();
    setSearchTerm(term);

    const filtered = clients.filter(client =>
      client.nombre.toLowerCase().includes(term) ||
      (client.telefono && client.telefono.includes(term))
    );
    setFilteredClients(filtered);
  };

  const openModal = (client) => {
    setCurrentClient(client);
    setPointsToAdd(1);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setCurrentClient(null);
  };

  const openEditModal = (client) => {
    setEditingId(client.id);
    setEditData({ nombre: client.nombre, telefono: client.telefono || '' });
    setEditModalOpen(true);
  };

  const closeEditModal = () => {
    setEditModalOpen(false);
    setEditingId(null);
    setEditData({ nombre: '', telefono: '' });
  };

  const handleAddPoints = async () => {
    if (!currentClient || pointsToAdd < 1) return;

    try {
      setAddingPoints(true);
      const newPoints = currentClient.puntos + parseInt(pointsToAdd);

      const { error } = await supabase
        .from('clientes_puntos')
        .update({ puntos: newPoints })
        .eq('id', currentClient.id);

      if (error) throw error;

      const updatedClients = clients.map(c =>
        c.id === currentClient.id ? { ...c, puntos: newPoints } : c
      );
      setClients(updatedClients);
      setFilteredClients(updatedClients.filter(c =>
        c.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.telefono && c.telefono.includes(searchTerm))
      ));

      closeModal();
    } catch (error) {
      console.error('Error adding points:', error);
      alert('Error al agregar puntos: ' + error.message);
    } finally {
      setAddingPoints(false);
    }
  };

  const handleResetPoints = async (client) => {
    if (!confirm(`¿Resetear puntos de ${client.nombre} a 0?`)) return;

    try {
      const { error } = await supabase
        .from('clientes_puntos')
        .update({ puntos: 0 })
        .eq('id', client.id);

      if (error) throw error;

      const updatedClients = clients.map(c =>
        c.id === client.id ? { ...c, puntos: 0 } : c
      );
      setClients(updatedClients);
      setFilteredClients(updatedClients.filter(c =>
        c.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.telefono && c.telefono.includes(searchTerm))
      ));
    } catch (error) {
      console.error('Error resetting points:', error);
      alert('Error al resetear: ' + error.message);
    }
  };

  const handleEditClient = async () => {
    if (!editData.nombre.trim()) {
      alert('El nombre no puede estar vacío');
      return;
    }

    try {
      const { error } = await supabase
        .from('clientes_puntos')
        .update({ 
          nombre: editData.nombre.trim(),
          telefono: editData.telefono.trim() || null
        })
        .eq('id', editingId);

      if (error) throw error;

      const updatedClients = clients.map(c =>
        c.id === editingId 
          ? { ...c, nombre: editData.nombre.trim(), telefono: editData.telefono.trim() || null } 
          : c
      );
      setClients(updatedClients);
      setFilteredClients(updatedClients.filter(c =>
        c.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.telefono && c.telefono.includes(searchTerm))
      ));

      closeEditModal();
    } catch (error) {
      console.error('Error editing client:', error);
      alert('Error al editar: ' + error.message);
    }
  };

  const handleDeleteClient = async (client) => {
    if (!confirm(`¿Eliminar a ${client.nombre}? Esta acción no se puede deshacer.`)) return;

    try {
      const { error } = await supabase
        .from('clientes_puntos')
        .delete()
        .eq('id', client.id);

      if (error) throw error;

      const updatedClients = clients.filter(c => c.id !== client.id);
      setClients(updatedClients);
      setFilteredClients(updatedClients.filter(c =>
        c.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.telefono && c.telefono.includes(searchTerm))
      ));
    } catch (error) {
      console.error('Error deleting client:', error);
      alert('Error al eliminar: ' + error.message);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <img src="/ISOLOGO.png" alt="Check Point" style={{ width: '60px', height: '60px', marginBottom: '10px' }} />
        <p className={styles.subtitle}>Sistema de puntos de fidelización</p>
      </div>

      <div className={styles.searchContainer}>
        <input
          type="text"
          placeholder="Busca un cliente por nombre o teléfono..."
          value={searchTerm}
          onChange={handleSearch}
          className={styles.searchInput}
        />
        <p className={styles.resultCount}>
          {filteredClients.length} cliente{filteredClients.length !== 1 ? 's' : ''} encontrado{filteredClients.length !== 1 ? 's' : ''}
        </p>
      </div>

      {loading ? (
        <div className={styles.loading}>Cargando clientes...</div>
      ) : (
        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Teléfono</th>
                <th>Puntos</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredClients.map((client) => (
                <tr 
                  key={client.id} 
                  className={client.puntos === 8 ? styles.rowHighlighted : styles.rowNormal}
                >
                  <td>{client.nombre}</td>
                  <td>{client.telefono || '-'}</td>
                  <td className={styles.points}>{client.puntos}</td>
                  <td className={styles.actionCell}>
                    {client.puntos === 8 ? (
                      <button
                        onClick={() => handleResetPoints(client)}
                        className={styles.resetButton}
                        title="Resetear a 0"
                      >
                        Resetear
                      </button>
                    ) : (
                      <button
                        onClick={() => openModal(client)}
                        className={styles.addButton}
                      >
                        +Punto
                      </button>
                    )}
                    <button
                      onClick={() => openEditModal(client)}
                      className={styles.editButton}
                      title="Editar cliente"
                    >
                      ✎
                    </button>
                    <button
                      onClick={() => handleDeleteClient(client)}
                      className={styles.deleteButton}
                      title="Eliminar cliente"
                    >
                      🗑
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modalOpen && currentClient && (
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            <h2>Agregar puntos a {currentClient.nombre}</h2>
            
            <div className={styles.inputGroup}>
              <label>Puntos a agregar:</label>
              <input
                type="number"
                min="1"
                max="10"
                value={pointsToAdd}
                onChange={(e) => setPointsToAdd(e.target.value)}
                className={styles.numberInput}
              />
            </div>

            <div className={styles.modalButtons}>
              <button
                onClick={closeModal}
                className={styles.cancelButton}
                disabled={addingPoints}
              >
                Cancelar
              </button>
              <button
                onClick={handleAddPoints}
                className={styles.confirmButton}
                disabled={addingPoints}
              >
                {addingPoints ? 'Guardando...' : 'Registrar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {editModalOpen && (
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            <h2>Editar cliente</h2>
            
            <div className={styles.inputGroup}>
              <label>Nombre:</label>
              <input
                type="text"
                value={editData.nombre}
                onChange={(e) => setEditData({ ...editData, nombre: e.target.value })}
                className={styles.textInput}
              />
            </div>

            <div className={styles.inputGroup}>
              <label>Teléfono:</label>
              <input
                type="text"
                value={editData.telefono}
                onChange={(e) => setEditData({ ...editData, telefono: e.target.value })}
                className={styles.textInput}
              />
            </div>

            <div className={styles.modalButtons}>
              <button
                onClick={closeEditModal}
                className={styles.cancelButton}
              >
                Cancelar
              </button>
              <button
                onClick={handleEditClient}
                className={styles.confirmButton}
              >
                Guardar cambios
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
