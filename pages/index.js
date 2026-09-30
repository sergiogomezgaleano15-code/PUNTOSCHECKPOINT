import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import styles from '../styles/Home.module.css';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log('Supabase URL:', supabaseUrl);
console.log('Anon Key:', supabaseAnonKey ? 'LOADED' : 'MISSING');

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

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
  try {
    setLoading(true);
    console.log('Fetching from:', supabaseUrl);
    const { data, error } = await supabase
      .from('clientes_puntos')
      .select('id, nombre, telefono, puntos')
      .order('nombre', { ascending: true });

    console.log('Response:', { data, error });
    
    if (error) {
      console.error('Supabase error:', error);
      throw error;
    }
    
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

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.title}>✓ CHECK POINT</div>
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
                <th>Acción</th>
              </tr>
            </thead>
            <tbody>
              {filteredClients.map((client, index) => (
                <tr key={client.id} className={index % 2 === 0 ? styles.rowEven : styles.rowOdd}>
                  <td>{client.nombre}</td>
                  <td>{client.telefono || '-'}</td>
                  <td className={styles.points}>{client.puntos}</td>
                  <td className={styles.actionCell}>
                    <button
                      onClick={() => openModal(client)}
                      className={styles.addButton}
                    >
                      +Punto
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
    </div>
  );
}
