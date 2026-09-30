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
      console.log('Fetching clients from Supabase...');
      const { data, error } = await supabase
        .from('clientes_puntos')
        .select('*')
        .order('nombre', { ascending: true });

      console.log('Supabase response:', { data, error });
      
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

      // Actualizar lista local
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
