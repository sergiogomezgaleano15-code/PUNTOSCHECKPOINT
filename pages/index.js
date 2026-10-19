import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import styles from '../styles/Home.module.css';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Puntos necesarios para canjear el premio
const PUNTOS_META = 8;

// Aplica el texto del buscador a una lista de clientes
const filtrar = (lista, term) => {
  const t = term.toLowerCase();
  return lista.filter(
    (c) =>
      c.nombre.toLowerCase().includes(t) ||
      (c.telefono && c.telefono.includes(t))
  );
};

export default function Home() {
  const [clients, setClients] = useState([]);
  const [filteredClients, setFilteredClients] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  // Modal de agregar puntos
  const [modalOpen, setModalOpen] = useState(false);
  const [currentClient, setCurrentClient] = useState(null);
  const [pointsToAdd, setPointsToAdd] = useState(1);
  const [addingPoints, setAddingPoints] = useState(false);

  // Modal de editar cliente
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editData, setEditData] = useState({ nombre: '', telefono: '' });
  const [editingId, setEditingId] = useState(null);

  // Modal de nuevo cliente
  const [newModalOpen, setNewModalOpen] = useState(false);
  const nuevoVacio = { nombre: '', telefono: '', correo: '', puntos: '' };
  const [newData, setNewData] = useState(nuevoVacio);
  const [savingNew, setSavingNew] = useState(false);

  useEffect(() => {
    fetchClients();
  }, []);

  // Actualiza la lista completa y la lista filtrada a la vez
  const updateClients = (list, term = searchTerm) => {
    setClients(list);
    setFilteredClients(filtrar(list, term));
  };

  const fetchClients = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('clientes_puntos')
        .select('*')
        .order('nombre', { ascending: true });

      if (error) throw error;
      updateClients(data || [], '');
    } catch (error) {
      console.error('Error fetching clients:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    const term = e.target.value;
    setSearchTerm(term);
    setFilteredClients(filtrar(clients, term));
  };

  // ---------- Agregar puntos ----------
  const openModal = (client) => {
    setCurrentClient(client);
    setPointsToAdd(1);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setCurrentClient(null);
  };

  const handleAddPoints = async () => {
    const puntos = parseInt(pointsToAdd, 10);
    if (!currentClient || isNaN(puntos) || puntos < 1) return;

    try {
      setAddingPoints(true);
      const newPoints = currentClient.puntos + puntos;

      const { error } = await supabase
        .from('clientes_puntos')
        .update({ puntos: newPoints })
        .eq('id', currentClient.id);

      if (error) throw error;

      updateClients(
        clients.map((c) =>
          c.id === currentClient.id ? { ...c, puntos: newPoints } : c
        )
      );
      closeModal();
    } catch (error) {
      console.error('Error adding points:', error);
      alert('Error al agregar puntos: ' + error.message);
    } finally {
      setAddingPoints(false);
    }
  };

  // ---------- Resetear puntos ----------
  const handleResetPoints = async (client) => {
    if (!confirm(`¿Resetear puntos de ${client.nombre} a 0?`)) return;

    try {
      const { error } = await supabase
        .from('clientes_puntos')
        .update({ puntos: 0 })
        .eq('id', client.id);

      if (error) throw error;

      updateClients(
        clients.map((c) => (c.id === client.id ? { ...c, puntos: 0 } : c))
      );
    } catch (error) {
      console.error('Error resetting points:', error);
      alert('Error al resetear: ' + error.message);
    }
  };

  // ---------- Editar cliente ----------
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

  const handleEditClient = async () => {
    const nombre = editData.nombre.trim();
    const telefono = editData.telefono.trim() || null;

    if (!nombre) {
      alert('El nombre no puede estar vacío');
      return;
    }

    try {
      const { error } = await supabase
        .from('clientes_puntos')
        .update({ nombre, telefono })
        .eq('id', editingId);

      if (error) throw error;

      updateClients(
        clients
          .map((c) => (c.id === editingId ? { ...c, nombre, telefono } : c))
          .sort((a, b) => a.nombre.localeCompare(b.nombre))
      );
      closeEditModal();
    } catch (error) {
      console.error('Error editing client:', error);
      alert('Error al editar: ' + error.message);
    }
  };

  // ---------- Nuevo cliente ----------
  const openNewModal = () => {
    setNewData(nuevoVacio);
    setNewModalOpen(true);
  };

  const closeNewModal = () => {
    setNewModalOpen(false);
    setNewData(nuevoVacio);
  };

  const handleNewClient = async () => {
    const nombre = newData.nombre.trim();
    const telefono = newData.telefono.trim();
    const correo = newData.correo.trim().toLowerCase();
    const puntos = parseInt(newData.puntos, 10);

    // Todos los campos son obligatorios
    if (!nombre || !telefono || !correo || newData.puntos === '') {
      alert('Nombre, celular, correo y puntos son obligatorios');
      return;
    }

    if (!/^\d{7,15}$/.test(telefono.replace(/[\s+-]/g, ''))) {
      alert('El número de celular no es válido');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) {
      alert('El correo electrónico no es válido');
      return;
    }

    if (isNaN(puntos) || puntos < 0 || puntos > PUNTOS_META) {
      alert(`Los puntos deben estar entre 0 y ${PUNTOS_META}`);
      return;
    }

    // Evita duplicados por teléfono o correo
    if (clients.some((c) => c.telefono === telefono)) {
      alert('Ya existe un cliente con ese celular');
      return;
    }
    if (clients.some((c) => c.correo && c.correo.toLowerCase() === correo)) {
      alert('Ya existe un cliente con ese correo');
      return;
    }

    try {
      setSavingNew(true);
      const { data, error } = await supabase
        .from('clientes_puntos')
        .insert({ nombre, telefono, correo, puntos })
        .select()
        .single();

      if (error) throw error;

      const updated = [...clients, data].sort((a, b) =>
        a.nombre.localeCompare(b.nombre)
      );
      // Limpia el buscador para que el cliente nuevo se vea en la lista
      setSearchTerm('');
      updateClients(updated, '');
      closeNewModal();
    } catch (error) {
      console.error('Error creating client:', error);
      alert('Error al crear cliente: ' + error.message);
    } finally {
      setSavingNew(false);
    }
  };

  // ---------- Eliminar cliente ----------
  const handleDeleteClient = async (client) => {
    if (
      !confirm(`¿Eliminar a ${client.nombre}? Esta acción no se puede deshacer.`)
    )
      return;

    try {
      const { error } = await supabase
        .from('clientes_puntos')
        .delete()
        .eq('id', client.id);

      if (error) throw error;

      updateClients(clients.filter((c) => c.id !== client.id));
    } catch (error) {
      console.error('Error deleting client:', error);
      alert('Error al eliminar: ' + error.message);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <img
          src="/ISOLOGO.png"
          alt="Check Point"
          style={{ width: '60px', height: '60px', marginBottom: '10px' }}
        />
        <p className={styles.subtitle}>Sistema de puntos de fidelización</p>
      </div>

      <div className={styles.searchContainer}>
        <div className={styles.searchRow}>
          <input
            type="text"
            placeholder="Busca un cliente por nombre o teléfono..."
            value={searchTerm}
            onChange={handleSearch}
            className={styles.searchInput}
          />
          <button onClick={openNewModal} className={styles.newButton}>
            + Añadir cliente
          </button>
        </div>
        <p className={styles.resultCount}>
          {filteredClients.length} cliente
          {filteredClients.length !== 1 ? 's' : ''} encontrado
          {filteredClients.length !== 1 ? 's' : ''}
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
              {filteredClients.map((client) => {
                const completo = client.puntos >= PUNTOS_META;
                return (
                  <tr
                    key={client.id}
                    className={completo ? styles.rowHighlighted : styles.rowNormal}
                  >
                    <td>{client.nombre}</td>
                    <td>{client.telefono || '-'}</td>
                    <td className={styles.points}>{client.puntos}</td>
                    <td className={styles.actionCell}>
                      {completo ? (
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
                );
              })}
              {filteredClients.length === 0 && (
                <tr>
                  <td colSpan={4} className={styles.emptyRow}>
                    No hay clientes que coincidan con la búsqueda.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal: agregar puntos */}
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

      {/* Modal: editar cliente */}
      {editModalOpen && (
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            <h2>Editar cliente</h2>

            <div className={styles.inputGroup}>
              <label>Nombre:</label>
              <input
                type="text"
                value={editData.nombre}
                onChange={(e) =>
                  setEditData({ ...editData, nombre: e.target.value })
                }
                className={styles.textInput}
              />
            </div>

            <div className={styles.inputGroup}>
              <label>Teléfono:</label>
              <input
                type="text"
                value={editData.telefono}
                onChange={(e) =>
                  setEditData({ ...editData, telefono: e.target.value })
                }
                className={styles.textInput}
              />
            </div>

            <div className={styles.modalButtons}>
              <button onClick={closeEditModal} className={styles.cancelButton}>
                Cancelar
              </button>
              <button onClick={handleEditClient} className={styles.confirmButton}>
                Guardar cambios
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: nuevo cliente */}
      {newModalOpen && (
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            <h2>Nuevo cliente</h2>

            <div className={styles.inputGroup}>
              <label>Nombre *</label>
              <input
                type="text"
                autoFocus
                required
                value={newData.nombre}
                onChange={(e) =>
                  setNewData({ ...newData, nombre: e.target.value })
                }
                className={styles.textInput}
              />
            </div>

            <div className={styles.inputGroup}>
              <label>Número de celular *</label>
              <input
                type="tel"
                required
                value={newData.telefono}
                onChange={(e) =>
                  setNewData({ ...newData, telefono: e.target.value })
                }
                className={styles.textInput}
              />
            </div>

            <div className={styles.inputGroup}>
              <label>Correo electrónico *</label>
              <input
                type="email"
                required
                value={newData.correo}
                onChange={(e) =>
                  setNewData({ ...newData, correo: e.target.value })
                }
                className={styles.textInput}
              />
            </div>

            <div className={styles.inputGroup}>
              <label>Cantidad de puntos * (0 a {PUNTOS_META})</label>
              <input
                type="number"
                required
                min="0"
                max={PUNTOS_META}
                value={newData.puntos}
                onChange={(e) =>
                  setNewData({ ...newData, puntos: e.target.value })
                }
                className={styles.textInput}
              />
            </div>

            <div className={styles.modalButtons}>
              <button
                onClick={closeNewModal}
                className={styles.cancelButton}
                disabled={savingNew}
              >
                Cancelar
              </button>
              <button
                onClick={handleNewClient}
                className={styles.confirmButton}
                disabled={savingNew}
              >
                {savingNew ? 'Guardando...' : 'Crear cliente'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
