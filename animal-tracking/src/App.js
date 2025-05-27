import React, { useState, useEffect, useRef } from 'react';
import { Camera, Plus, Search, QrCode, Calendar, Users, Egg, Edit3, Trash2, Save, X, ArrowLeft, FileImage, Sun, Moon, Menu, Filter, Heart, Clock, Thermometer, Droplets, AlertCircle, CheckCircle } from 'lucide-react';
import './App.css';

// API configuration
const API_BASE = 'http://localhost:3001/api';

// API helper functions
const api = {
    // Animals
    getAnimals: () => fetch(`${API_BASE}/animals`).then(res => res.json()),
    createAnimal: (animal) => fetch(`${API_BASE}/animals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(animal)
    }).then(res => res.json()),
    updateAnimal: (id, animal) => fetch(`${API_BASE}/animals/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(animal)
    }).then(res => res.json()),
    deleteAnimal: (id) => fetch(`${API_BASE}/animals/${id}`, {
        method: 'DELETE'
    }).then(res => res.json()),

    // Breedings
    getBreedings: () => fetch(`${API_BASE}/breedings`).then(res => res.json()),
    createBreeding: (breeding) => fetch(`${API_BASE}/breedings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(breeding)
    }).then(res => res.json()),
    updateBreeding: (id, breeding) => fetch(`${API_BASE}/breedings/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(breeding)
    }).then(res => res.json()),
    deleteBreeding: (id) => fetch(`${API_BASE}/breedings/${id}`, {
        method: 'DELETE'
    }).then(res => res.json()),

    // Hatchings
    getHatchings: () => fetch(`${API_BASE}/hatchings`).then(res => res.json()),
    createHatching: (hatching) => fetch(`${API_BASE}/hatchings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(hatching)
    }).then(res => res.json()),
    updateHatching: (id, hatching) => fetch(`${API_BASE}/hatchings/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(hatching)
    }).then(res => res.json()),
    deleteHatching: (id) => fetch(`${API_BASE}/hatchings/${id}`, {
        method: 'DELETE'
    }).then(res => res.json())
};

// Theme management
const themeManager = {
    get: () => localStorage.getItem('theme') || 'light',
    set: (theme) => localStorage.setItem('theme', theme)
};

// Image compression utility
const compressImage = (file, maxWidth = 800, quality = 0.8) => {
    return new Promise((resolve) => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();

        img.onload = () => {
            const ratio = Math.min(maxWidth / img.width, maxWidth / img.height);
            canvas.width = img.width * ratio;
            canvas.height = img.height * ratio;

            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            canvas.toBlob(resolve, 'image/jpeg', quality);
        };

        img.src = URL.createObjectURL(file);
    });
};

// Utility functions
const calculateDaysRemaining = (targetDate) => {
    const today = new Date();
    const target = new Date(targetDate);
    const diffTime = target - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
};

const calculateAge = (birthDate) => {
    const days = Math.floor((new Date() - new Date(birthDate)) / (1000 * 60 * 60 * 24));
    return days;
};

const getStatusColor = (status) => {
    switch (status.toLowerCase()) {
        case 'active':
            return 'status-active';
        case 'breeder':
            return 'status-breeder';
        case 'retired':
            return 'status-retired';
        case 'pending':
            return 'status-pending';
        case 'successful':
            return 'status-success';
        case 'failed':
            return 'status-failed';
        case 'incubating':
            return 'status-incubating';
        case 'hatching':
            return 'status-hatching';
        case 'completed':
            return 'status-completed';
        default:
            return 'status-default';
    }
};

// QR Code component
const QRCode = ({ value, size = 100 }) => {
    return ( <
        div className = "qr-code"
        style = {
            { width: size, height: size }
        } >
        <
        div className = "qr-code-header" > QR CODE < /div> <
        div className = "qr-code-content" > { value } < /div> < /
        div >
    );
};

// Breeding Page Component
const BreedingPage = ({ animals }) => {
    const [breedings, setBreedings] = useState([]);
    const [showAddForm, setShowAddForm] = useState(false);
    const [editingBreeding, setEditingBreeding] = useState(null);
    const [loading, setLoading] = useState(true);

    const [newBreeding, setNewBreeding] = useState({
        maleId: '',
        femaleId: '',
        breedingDate: '',
        gestationDays: 31, // Default for rabbits
        notes: ''
    });

    useEffect(() => {
        loadBreedings();
    }, []);

    const loadBreedings = async() => {
        try {
            const data = await api.getBreedings();
            console.log('Loaded breedings:', data); // Debug log
            setBreedings(data);
        } catch (error) {
            console.error('Error loading breedings:', error);
            // Fallback to localStorage if API fails
            const localBreedings = JSON.parse(localStorage.getItem('breedings') || '[]');
            setBreedings(localBreedings);
        } finally {
            setLoading(false);
        }
    };

    const calculateExpectedDate = (breedingDate, gestationDays) => {
        const date = new Date(breedingDate);
        date.setDate(date.getDate() + gestationDays);
        return date.toISOString().split('T')[0];
    };

    const handleAddBreeding = async() => {
        if (!newBreeding.maleId || !newBreeding.femaleId || !newBreeding.breedingDate) return;

        const maleAnimal = animals.find(a => a.id === newBreeding.maleId);
        const femaleAnimal = animals.find(a => a.id === newBreeding.femaleId);
        const expectedDate = calculateExpectedDate(newBreeding.breedingDate, newBreeding.gestationDays);

        const breeding = {
            id: Date.now().toString(),
            ...newBreeding,
            expectedDate,
            status: 'pending',
            // Add animal names for fallback display
            maleName: maleAnimal && maleAnimal.name ? maleAnimal.name : 'Unknown',
            femaleName: femaleAnimal && femaleAnimal.name ? femaleAnimal.name : 'Unknown',
            maleSpecies: maleAnimal && maleAnimal.species ? maleAnimal.species : 'unknown',
            femaleSpecies: femaleAnimal && femaleAnimal.species ? femaleAnimal.species : 'unknown'
        };

        try {
            await api.createBreeding(breeding);
            await loadBreedings();
            setNewBreeding({ maleId: '', femaleId: '', breedingDate: '', gestationDays: 31, notes: '' });
            setShowAddForm(false);
        } catch (error) {
            console.error('Error creating breeding:', error);
            // Fallback to localStorage
            const localBreedings = JSON.parse(localStorage.getItem('breedings') || '[]');
            localBreedings.push(breeding);
            localStorage.setItem('breedings', JSON.stringify(localBreedings));
            setBreedings(localBreedings);
            setNewBreeding({ maleId: '', femaleId: '', breedingDate: '', gestationDays: 31, notes: '' });
            setShowAddForm(false);
        }
    };

    const handleUpdateBreeding = async(id, updates) => {
        try {
            await api.updateBreeding(id, updates);
            await loadBreedings();
            setEditingBreeding(null);
        } catch (error) {
            console.error('Error updating breeding:', error);
        }
    };

    const handleDeleteBreeding = async(id) => {
        if (!window.confirm('Are you sure you want to delete this breeding record?')) return;

        try {
            await api.deleteBreeding(id);
            await loadBreedings();
        } catch (error) {
            console.error('Error deleting breeding:', error);
        }
    };

    const availableMales = animals.filter(a =>
        (a.status === 'Breeder' || a.status === 'Active') &&
        (a.sex === 'male' || !a.sex) // Include animals without sex specified for backward compatibility
    );
    const availableFemales = animals.filter(a =>
        (a.status === 'Breeder' || a.status === 'Active') &&
        (a.sex === 'female' || !a.sex) // Include animals without sex specified for backward compatibility
    );

    if (loading) {
        return <div className = "loading-state" > Loading breeding records... < /div>;
    }

    return ( <
        div >
        <
        div className = "page-header" >
        <
        div className = "page-title-section" >
        <
        Heart className = "page-icon"
        size = { 32 }
        /> <
        div >
        <
        h2 className = "page-title" > Breeding Tracker < /h2> <
        p className = "page-description" > Monitor mating pairs and track expected litter dates < /p> < /
        div > <
        /div>

        <
        button onClick = {
            () => setShowAddForm(true)
        }
        className = "btn btn-success" >
        <
        Plus size = { 16 }
        />
        Add Breeding Record <
        /button> < /
        div >

        { /* Add Breeding Form Modal */ } {
            showAddForm && ( <
                    div className = "modal-overlay" >
                    <
                    div className = "modal" >
                    <
                    div className = "modal-content" >
                    <
                    h2 className = "modal-title" > Add Breeding Record < /h2> <
                    div className = "form-grid" >
                    <
                    div className = "form-group" >
                    <
                    label className = "form-label" > Male < /label> <
                    select value = { newBreeding.maleId }
                    onChange = {
                        (e) => setNewBreeding(prev => ({...prev, maleId: e.target.value }))
                    }
                    className = "form-input" >
                    <
                    option value = "" > Select Male < /option> {
                    availableMales.map(animal => ( <
                        option key = { animal.id }
                        value = { animal.id } > { animal.name }({ animal.species }) { animal.sex ? ' ♂' : '' } <
                        /option>
                    ))
                } <
                /select> < /
                div > <
                div className = "form-group" >
                <
                label className = "form-label" > Female < /label> <
            select value = { newBreeding.femaleId }
            onChange = {
                (e) => setNewBreeding(prev => ({...prev, femaleId: e.target.value }))
            }
            className = "form-input" >
                <
                option value = "" > Select Female < /option> {
            availableFemales.map(animal => ( <
                option key = { animal.id }
                value = { animal.id } > { animal.name }({ animal.species }) { animal.sex ? ' ♀' : '' } <
                /option>
            ))
        } <
        /select> < /
        div > <
        div className = "form-group" >
        <
        label className = "form-label" > Breeding Date < /label> <
        input type = "date"
        value = { newBreeding.breedingDate }
        onChange = {
            (e) => setNewBreeding(prev => ({...prev, breedingDate: e.target.value }))
        }
        className = "form-input" /
        >
        <
        /div> <
        div className = "form-group" >
        <
        label className = "form-label" > Gestation Period(Days) < /label> <
        input type = "number"
        value = { newBreeding.gestationDays }
        onChange = {
            (e) => setNewBreeding(prev => ({...prev, gestationDays: parseInt(e.target.value) || 31 }))
        }
        className = "form-input"
        min = "1"
        max = "365"
        placeholder = "Enter gestation days" /
        >
        <
        small className = "form-helper" > Expected birth: { newBreeding.breedingDate ? new Date(calculateExpectedDate(newBreeding.breedingDate, newBreeding.gestationDays)).toLocaleDateString() : 'Select breeding date' } < /small> < /
        div > <
        /div> <
        div className = "form-group" >
        <
        label className = "form-label" > Notes < /label> <
        textarea value = { newBreeding.notes }
        onChange = {
            (e) => setNewBreeding(prev => ({...prev, notes: e.target.value }))
        }
        rows = "3"
        className = "form-input form-textarea"
        placeholder = "Additional notes about the breeding..." /
        >
        <
        /div> <
        div className = "form-actions" >
        <
        button onClick = {
            () => setShowAddForm(false)
        }
        className = "btn-ghost" >
        Cancel <
        /button> <
        button onClick = { handleAddBreeding }
        disabled = {!newBreeding.maleId || !newBreeding.femaleId || !newBreeding.breedingDate }
        className = "btn btn-success"
        style = {
            { opacity: (!newBreeding.maleId || !newBreeding.femaleId || !newBreeding.breedingDate) ? 0.5 : 1 }
        } >
        Add Breeding Record <
        /button> < /
        div > <
        /div> < /
        div > <
        /div>
    )
}

{ /* Breeding Records Grid */ } <
div className = "records-grid" > {
        breedings.length > 0 ? breedings.map(breeding => {
            const daysRemaining = calculateDaysRemaining(breeding.expectedDate);
            const isOverdue = daysRemaining < 0;
            const isDueSoon = daysRemaining <= 3 && daysRemaining >= 0;

            return ( <
                div key = { breeding.id }
                className = "record-card breeding-card" >
                <
                div className = "record-header" >
                <
                div className = "breeding-pair" >
                <
                span className = "male-name" > ♂{ breeding.maleName || 'Unknown Male' } < /span> <
                Heart size = { 16 }
                className = "breeding-heart" / >
                <
                span className = "female-name" > ♀{ breeding.femaleName || 'Unknown Female' } < /span> < /
                div > <
                span className = { `status-badge ${getStatusColor(breeding.status)}` } > { breeding.status } <
                /span> < /
                div >

                <
                div className = "record-details" >
                <
                div className = "detail-row" >
                <
                Calendar size = { 16 }
                /> <
                span > Bred: { new Date(breeding.breedingDate).toLocaleDateString() } < /span> < /
                div > <
                div className = "detail-row" >
                <
                Clock size = { 16 }
                /> <
                span > Expected: { new Date(breeding.expectedDate).toLocaleDateString() } < /span> < /
                div > <
                div className = "detail-row" >
                <
                span > 🕐 < /span> <
                span > Gestation: { breeding.gestationDays || 31 }
                days < /span> < /
                div > {
                    daysRemaining >= 0 ? ( <
                        div className = { `detail-row ${isDueSoon ? 'due-soon' : ''}` } >
                        <
                        AlertCircle size = { 16 }
                        /> <
                        span > { daysRemaining }
                        days remaining < /span> < /
                        div >
                    ) : ( <
                        div className = "detail-row overdue" >
                        <
                        AlertCircle size = { 16 }
                        /> <
                        span > { Math.abs(daysRemaining) }
                        days overdue < /span> < /
                        div >
                    )
                } {
                    breeding.offspring > 0 && ( <
                        div className = "detail-row success" >
                        <
                        CheckCircle size = { 16 }
                        /> <
                        span > { breeding.offspring }
                        offspring < /span> < /
                        div >
                    )
                } <
                /div>

                {
                    breeding.notes && ( <
                        div className = "record-notes" >
                        <
                        p > { breeding.notes } < /p> < /
                        div >
                    )
                }

                <
                div className = "record-actions" >
                <
                button onClick = {
                    () => setEditingBreeding(breeding)
                }
                className = "btn-small btn-primary" >
                <
                Edit3 size = { 14 }
                /> < /
                button > <
                button onClick = {
                    () => handleDeleteBreeding(breeding.id)
                }
                className = "btn-small btn-danger" >
                <
                Trash2 size = { 14 }
                /> < /
                button > <
                /div> < /
                div >
            );
        }) : ( <
            div className = "empty-state" >
            <
            Heart size = { 64 }
            /> <
            h3 > No breeding records < /h3> <
            p > Start tracking breeding pairs by adding your first breeding record. < /p> < /
            div >
        )
    } <
    /div>

{ /* Edit Breeding Modal */ } {
    editingBreeding && ( <
        div className = "modal-overlay" >
        <
        div className = "modal" >
        <
        div className = "modal-content" >
        <
        h2 className = "modal-title" > Update Breeding Record < /h2> <
        div className = "form-grid" >
        <
        div className = "form-group" >
        <
        label className = "form-label" > Status < /label> <
        select value = { editingBreeding.status }
        onChange = {
            (e) => setEditingBreeding(prev => ({...prev, status: e.target.value }))
        }
        className = "form-input" >
        <
        option value = "pending" > Pending < /option> <
        option value = "successful" > Successful < /option> <
        option value = "failed" > Failed < /option> < /
        select > <
        /div> <
        div className = "form-group" >
        <
        label className = "form-label" > Actual Birth Date < /label> <
        input type = "date"
        value = { editingBreeding.actualDate || '' }
        onChange = {
            (e) => setEditingBreeding(prev => ({...prev, actualDate: e.target.value }))
        }
        className = "form-input" /
        >
        <
        /div> <
        div className = "form-group" >
        <
        label className = "form-label" > Number of Offspring < /label> <
        input type = "number"
        value = { editingBreeding.offspring || 0 }
        onChange = {
            (e) => setEditingBreeding(prev => ({...prev, offspring: parseInt(e.target.value) || 0 }))
        }
        className = "form-input"
        min = "0" /
        >
        <
        /div> < /
        div > <
        div className = "form-group" >
        <
        label className = "form-label" > Notes < /label> <
        textarea value = { editingBreeding.notes || '' }
        onChange = {
            (e) => setEditingBreeding(prev => ({...prev, notes: e.target.value }))
        }
        rows = "3"
        className = "form-input form-textarea" /
        >
        <
        /div> <
        div className = "form-actions" >
        <
        button onClick = {
            () => setEditingBreeding(null)
        }
        className = "btn-ghost" >
        Cancel <
        /button> <
        button onClick = {
            () => handleUpdateBreeding(editingBreeding.id, {
                status: editingBreeding.status,
                actualDate: editingBreeding.actualDate,
                offspring: editingBreeding.offspring,
                notes: editingBreeding.notes
            })
        }
        className = "btn btn-success" >
        Update Record <
        /button> < /
        div > <
        /div> < /
        div > <
        /div>
    )
} <
/div>
);
};

// Hatching Page Component
const HatchingPage = () => {
    const [hatchings, setHatchings] = useState([]);
    const [showAddForm, setShowAddForm] = useState(false);
    const [editingHatching, setEditingHatching] = useState(null);
    const [loading, setLoading] = useState(true);

    const [newHatching, setNewHatching] = useState({
        name: '',
        totalEggs: '',
        startDate: '',
        incubationDays: 21, // Default for chickens
        temperature: 37.5,
        humidity: 60,
        notes: ''
    });

    useEffect(() => {
        loadHatchings();
    }, []);

    const loadHatchings = async() => {
        try {
            const data = await api.getHatchings();
            setHatchings(data);
        } catch (error) {
            console.error('Error loading hatchings:', error);
        } finally {
            setLoading(false);
        }
    };

    const calculateExpectedHatchDate = (startDate, incubationDays) => {
        const date = new Date(startDate);
        date.setDate(date.getDate() + incubationDays);
        return date.toISOString().split('T')[0];
    };

    const handleAddHatching = async() => {
        if (!newHatching.name || !newHatching.totalEggs || !newHatching.startDate) return;

        const expectedHatchDate = calculateExpectedHatchDate(newHatching.startDate, newHatching.incubationDays);

        const hatching = {
            id: Date.now().toString(),
            ...newHatching,
            totalEggs: parseInt(newHatching.totalEggs),
            incubationDays: parseInt(newHatching.incubationDays),
            expectedHatchDate,
            status: 'incubating'
        };

        try {
            await api.createHatching(hatching);
            await loadHatchings();
            setNewHatching({
                name: '',
                totalEggs: '',
                startDate: '',
                incubationDays: 21,
                temperature: 37.5,
                humidity: 60,
                notes: ''
            });
            setShowAddForm(false);
        } catch (error) {
            console.error('Error creating hatching:', error);
        }
    };

    const handleUpdateHatching = async(id, updates) => {
        try {
            await api.updateHatching(id, updates);
            await loadHatchings();
            setEditingHatching(null);
        } catch (error) {
            console.error('Error updating hatching:', error);
        }
    };

    const handleDeleteHatching = async(id) => {
        if (!window.confirm('Are you sure you want to delete this hatching record?')) return;

        try {
            await api.deleteHatching(id);
            await loadHatchings();
        } catch (error) {
            console.error('Error deleting hatching:', error);
        }
    };

    if (loading) {
        return <div className = "loading-state" > Loading hatching records... < /div>;
    }

    return ( <
        div >
        <
        div className = "page-header" >
        <
        div className = "page-title-section" >
        <
        Egg className = "page-icon"
        size = { 32 }
        /> <
        div >
        <
        h2 className = "page-title" > Egg Hatching Tracker < /h2> <
        p className = "page-description" > Monitor incubation progress and track hatch rates < /p> < /
        div > <
        /div>

        <
        button onClick = {
            () => setShowAddForm(true)
        }
        className = "btn btn-success" >
        <
        Plus size = { 16 }
        />
        Add Hatching Batch <
        /button> < /
        div >

        { /* Add Hatching Form Modal */ } {
            showAddForm && ( <
                div className = "modal-overlay" >
                <
                div className = "modal" >
                <
                div className = "modal-content" >
                <
                h2 className = "modal-title" > Add Hatching Batch < /h2> <
                div className = "form-grid" >
                <
                div className = "form-group" >
                <
                label className = "form-label" > Batch Name < /label> <
                input type = "text"
                value = { newHatching.name }
                onChange = {
                    (e) => setNewHatching(prev => ({...prev, name: e.target.value }))
                }
                className = "form-input"
                placeholder = "e.g., Batch March 2024" /
                >
                <
                /div> <
                div className = "form-group" >
                <
                label className = "form-label" > Total Eggs < /label> <
                input type = "number"
                value = { newHatching.totalEggs }
                onChange = {
                    (e) => setNewHatching(prev => ({...prev, totalEggs: e.target.value }))
                }
                className = "form-input"
                min = "1" /
                >
                <
                /div> <
                div className = "form-group" >
                <
                label className = "form-label" > Start Date < /label> <
                input type = "date"
                value = { newHatching.startDate }
                onChange = {
                    (e) => setNewHatching(prev => ({...prev, startDate: e.target.value }))
                }
                className = "form-input" /
                >
                <
                /div> <
                div className = "form-group" >
                <
                label className = "form-label" > Incubation Days < /label> <
                input type = "number"
                value = { newHatching.incubationDays }
                onChange = {
                    (e) => setNewHatching(prev => ({...prev, incubationDays: parseInt(e.target.value) }))
                }
                className = "form-input"
                min = "1" /
                >
                <
                /div> <
                div className = "form-group" >
                <
                label className = "form-label" > Temperature(°C) < /label> <
                input type = "number"
                step = "0.1"
                value = { newHatching.temperature }
                onChange = {
                    (e) => setNewHatching(prev => ({...prev, temperature: parseFloat(e.target.value) }))
                }
                className = "form-input" /
                >
                <
                /div> <
                div className = "form-group" >
                <
                label className = "form-label" > Humidity( % ) < /label> <
                input type = "number"
                value = { newHatching.humidity }
                onChange = {
                    (e) => setNewHatching(prev => ({...prev, humidity: parseInt(e.target.value) }))
                }
                className = "form-input"
                min = "0"
                max = "100" /
                >
                <
                /div> < /
                div > <
                div className = "form-group" >
                <
                label className = "form-label" > Notes < /label> <
                textarea value = { newHatching.notes }
                onChange = {
                    (e) => setNewHatching(prev => ({...prev, notes: e.target.value }))
                }
                rows = "3"
                className = "form-input form-textarea"
                placeholder = "Additional notes about incubation conditions..." /
                >
                <
                /div> <
                div className = "form-actions" >
                <
                button onClick = {
                    () => setShowAddForm(false)
                }
                className = "btn-ghost" >
                Cancel <
                /button> <
                button onClick = { handleAddHatching }
                disabled = {!newHatching.name || !newHatching.totalEggs || !newHatching.startDate }
                className = "btn btn-success"
                style = {
                    { opacity: (!newHatching.name || !newHatching.totalEggs || !newHatching.startDate) ? 0.5 : 1 }
                } >
                Add Hatching Batch <
                /button> < /
                div > <
                /div> < /
                div > <
                /div>
            )
        }

        { /* Hatching Records Grid */ } <
        div className = "records-grid" > {
            hatchings.map(hatching => {
                const daysRemaining = calculateDaysRemaining(hatching.expectedHatchDate);
                const isOverdue = daysRemaining < 0;
                const isDueSoon = daysRemaining <= 2 && daysRemaining >= 0;
                const hatchRate = hatching.totalEggs > 0 ? ((hatching.hatchedEggs / hatching.totalEggs) * 100).toFixed(1) : 0;

                return ( <
                    div key = { hatching.id }
                    className = "record-card hatching-card" >
                    <
                    div className = "record-header" >
                    <
                    h3 className = "record-title" > { hatching.name } < /h3> <
                    span className = { `status-badge ${getStatusColor(hatching.status)}` } > { hatching.status } <
                    /span> < /
                    div >

                    <
                    div className = "hatching-stats" >
                    <
                    div className = "stat-item" >
                    <
                    span className = "stat-value" > { hatching.hatchedEggs }
                    /{hatching.totalEggs}</span >
                    <
                    span className = "stat-label" > Hatched < /span> < /
                    div > <
                    div className = "stat-item" >
                    <
                    span className = "stat-value" > { hatchRate } % < /span> <
                    span className = "stat-label" > Hatch Rate < /span> < /
                    div > <
                    /div>

                    <
                    div className = "record-details" >
                    <
                    div className = "detail-row" >
                    <
                    Calendar size = { 16 }
                    /> <
                    span > Started: { new Date(hatching.startDate).toLocaleDateString() } < /span> < /
                    div > <
                    div className = "detail-row" >
                    <
                    Clock size = { 16 }
                    /> <
                    span > Expected: { new Date(hatching.expectedHatchDate).toLocaleDateString() } < /span> < /
                    div > {
                        daysRemaining >= 0 ? ( <
                            div className = { `detail-row ${isDueSoon ? 'due-soon' : ''}` } >
                            <
                            AlertCircle size = { 16 }
                            /> <
                            span > { daysRemaining }
                            days remaining < /span> < /
                            div >
                        ) : hatching.status === 'incubating' ? ( <
                            div className = "detail-row overdue" >
                            <
                            AlertCircle size = { 16 }
                            /> <
                            span > { Math.abs(daysRemaining) }
                            days overdue < /span> < /
                            div >
                        ) : null
                    }

                    <
                    div className = "detail-row" >
                    <
                    Thermometer size = { 16 }
                    /> <
                    span > { hatching.temperature }°
                    C < /span> < /
                    div > <
                    div className = "detail-row" >
                    <
                    Droplets size = { 16 }
                    /> <
                    span > { hatching.humidity } % humidity < /span> < /
                    div > <
                    /div>

                    {
                        hatching.notes && ( <
                            div className = "record-notes" >
                            <
                            p > { hatching.notes } < /p> < /
                            div >
                        )
                    }

                    <
                    div className = "record-actions" >
                    <
                    button onClick = {
                        () => setEditingHatching(hatching)
                    }
                    className = "btn-small btn-primary" >
                    <
                    Edit3 size = { 14 }
                    /> < /
                    button > <
                    button onClick = {
                        () => handleDeleteHatching(hatching.id)
                    }
                    className = "btn-small btn-danger" >
                    <
                    Trash2 size = { 14 }
                    /> < /
                    button > <
                    /div> < /
                    div >
                );
            })
        } <
        /div>

        {
            hatchings.length === 0 && ( <
                div className = "empty-state" >
                <
                Egg size = { 64 }
                /> <
                h3 > No hatching records < /h3> <
                p > Start tracking egg incubation by adding your first hatching batch. < /p> < /
                div >
            )
        }

        { /* Edit Hatching Modal */ } {
            editingHatching && ( <
                div className = "modal-overlay" >
                <
                div className = "modal" >
                <
                div className = "modal-content" >
                <
                h2 className = "modal-title" > Update Hatching Record < /h2> <
                div className = "form-grid" >
                <
                div className = "form-group" >
                <
                label className = "form-label" > Status < /label> <
                select value = { editingHatching.status }
                onChange = {
                    (e) => setEditingHatching(prev => ({...prev, status: e.target.value }))
                }
                className = "form-input" >
                <
                option value = "incubating" > Incubating < /option> <
                option value = "hatching" > Hatching < /option> <
                option value = "completed" > Completed < /option> < /
                select > <
                /div> <
                div className = "form-group" >
                <
                label className = "form-label" > Hatched Eggs < /label> <
                input type = "number"
                value = { editingHatching.hatchedEggs || 0 }
                onChange = {
                    (e) => setEditingHatching(prev => ({...prev, hatchedEggs: parseInt(e.target.value) || 0 }))
                }
                className = "form-input"
                min = "0"
                max = { editingHatching.totalEggs }
                /> < /
                div > <
                div className = "form-group" >
                <
                label className = "form-label" > Actual Hatch Date < /label> <
                input type = "date"
                value = { editingHatching.actualHatchDate || '' }
                onChange = {
                    (e) => setEditingHatching(prev => ({...prev, actualHatchDate: e.target.value }))
                }
                className = "form-input" /
                >
                <
                /div> <
                div className = "form-group" >
                <
                label className = "form-label" > Temperature(°C) < /label> <
                input type = "number"
                step = "0.1"
                value = { editingHatching.temperature || '' }
                onChange = {
                    (e) => setEditingHatching(prev => ({...prev, temperature: parseFloat(e.target.value) }))
                }
                className = "form-input" /
                >
                <
                /div> <
                div className = "form-group" >
                <
                label className = "form-label" > Humidity( % ) < /label> <
                input type = "number"
                value = { editingHatching.humidity || '' }
                onChange = {
                    (e) => setEditingHatching(prev => ({...prev, humidity: parseInt(e.target.value) }))
                }
                className = "form-input"
                min = "0"
                max = "100" /
                >
                <
                /div> < /
                div > <
                div className = "form-group" >
                <
                label className = "form-label" > Notes < /label> <
                textarea value = { editingHatching.notes || '' }
                onChange = {
                    (e) => setEditingHatching(prev => ({...prev, notes: e.target.value }))
                }
                rows = "3"
                className = "form-input form-textarea" /
                >
                <
                /div> <
                div className = "form-actions" >
                <
                button onClick = {
                    () => setEditingHatching(null)
                }
                className = "btn-ghost" >
                Cancel <
                /button> <
                button onClick = {
                    () => handleUpdateHatching(editingHatching.id, {
                        status: editingHatching.status,
                        hatchedEggs: editingHatching.hatchedEggs,
                        actualHatchDate: editingHatching.actualHatchDate,
                        temperature: editingHatching.temperature,
                        humidity: editingHatching.humidity,
                        notes: editingHatching.notes
                    })
                }
                className = "btn btn-success" >
                Update Record <
                /button> < /
                div > <
                /div> < /
                div > <
                /div>
            )
        } <
        /div>
    );
};

// Individual Animal Page
const AnimalPage = ({ animal, onBack, onUpdate, onDelete }) => {
        const [isEditing, setIsEditing] = useState(false);
        const [editData, setEditData] = useState(animal);
        const fileInputRef = useRef();

        const handleImageUpload = async(e) => {
            const file = e.target.files[0];
            if (file) {
                const compressedFile = await compressImage(file);
                const reader = new FileReader();
                reader.onload = (e) => {
                    setEditData(prev => ({...prev, image: e.target.result }));
                };
                reader.readAsDataURL(compressedFile);
            }
        };

        const handleSave = () => {
            onUpdate(editData);
            setIsEditing(false);
        };

        const handlePrint = () => {
                const printContent = `
      <div style="display: flex; align-items: center; padding: 20px; font-family: Arial;">
        <div style="margin-right: 20px;">
          <div style="width: 100px; height: 100px; background: black; color: white; display: flex; align-items: center; justify-content: center; font-size: 8px; border-radius: 12px;">
            QR: ${animal.id}
          </div>
        </div>
        <div>
          <h3>${animal.name}</h3>
          <p>ID: ${animal.id}</p>
          <p>DOB: ${animal.dateOfBirth}</p>
        </div>
        ${animal.image ? `<img src="${animal.image}" style="width: 80px; height: 80px; object-fit: cover; border-radius: 12px; margin-left: 20px;">` : ''}
      </div>
    `;
    
    const printWindow = window.open('', '_blank');
    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.print();
  };

  return (
    <div className="app">
      <div className="main">
        <div className="animal-page-card">
          <div className="animal-page-header">
            <button onClick={onBack} className="btn-back">
              <ArrowLeft size={16} />
              Back to Animals
            </button>
            <div className="animal-page-actions">
              <button onClick={handlePrint} className="btn btn-success">
                <QrCode size={16} />
                Print QR Label
              </button>
              {!isEditing ? (
                <button onClick={() => setIsEditing(true)} className="btn btn-primary">
                  <Edit3 size={16} />
                  Edit
                </button>
              ) : (
                <div className="button-group">
                  <button onClick={handleSave} className="btn btn-success">
                    <Save size={16} />
                    Save
                  </button>
                  <button onClick={() => setIsEditing(false)} className="btn btn-secondary">
                    <X size={16} />
                    Cancel
                  </button>
                </div>
              )}
              <button onClick={() => onDelete(animal.id)} className="btn btn-danger">
                <Trash2 size={16} />
                Delete
              </button>
            </div>
          </div>

          <div className="animal-page-content">
            <div className="animal-page-main">
              {isEditing ? (
                <div className="edit-form">
                  <div className="form-group">
                    <label className="form-label">Name</label>
                    <input
                      type="text"
                      value={editData.name}
                      onChange={(e) => setEditData(prev => ({ ...prev, name: e.target.value }))}
                      className="form-input"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Species</label>
                    <select
                      value={editData.species}
                      onChange={(e) => setEditData(prev => ({ ...prev, species: e.target.value }))}
                      className="form-input"
                    >
                      <option value="rabbit">Rabbit</option>
                      <option value="quail">Quail</option>
                      <option value="chicken">Chicken</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Breed</label>
                    <input
                      type="text"
                      value={editData.breed || ''}
                      onChange={(e) => setEditData(prev => ({ ...prev, breed: e.target.value }))}
                      className="form-input"
                      placeholder="Enter breed"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Color</label>
                    <input
                      type="text"
                      value={editData.color || ''}
                      onChange={(e) => setEditData(prev => ({ ...prev, color: e.target.value }))}
                      className="form-input"
                      placeholder="Enter color"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Sex</label>
                    <select
                      value={editData.sex || ''}
                      onChange={(e) => setEditData(prev => ({ ...prev, sex: e.target.value }))}
                      className="form-input"
                    >
                      <option value="">Select Sex</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Date of Birth</label>
                    <input
                      type="date"
                      value={editData.dateOfBirth}
                      onChange={(e) => setEditData(prev => ({ ...prev, dateOfBirth: e.target.value }))}
                      className="form-input"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Status</label>
                    <select
                      value={editData.status}
                      onChange={(e) => setEditData(prev => ({ ...prev, status: e.target.value }))}
                      className="form-input"
                    >
                      <option value="Active">Active</option>
                      <option value="Breeder">Breeder</option>
                      <option value="Retired">Retired</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Notes</label>
                    <textarea
                      value={editData.notes || ''}
                      onChange={(e) => setEditData(prev => ({ ...prev, notes: e.target.value }))}
                      rows="4"
                      className="form-input form-textarea"
                    />
                  </div>
                </div>
              ) : (
                <div className="animal-details-view">
                  <div className="animal-header">
                    <h1 className="animal-title">{animal.name}</h1>
                    <span className={`status-badge ${getStatusColor(animal.status)}`}>
                      {animal.status}
                    </span>
                  </div>
                  
                  <div className="animal-info-grid">
                    <div className="info-card">
                      <span className="info-label">Animal ID</span>
                      <p className="info-value">{animal.id}</p>
                    </div>
                    <div className="info-card">
                      <span className="info-label">Species</span>
                      <p className="info-value" style={{ textTransform: 'capitalize' }}>{animal.species}</p>
                    </div>
                    {animal.breed && (
                      <div className="info-card">
                        <span className="info-label">Breed</span>
                        <p className="info-value">{animal.breed}</p>
                      </div>
                    )}
                    {animal.color && (
                      <div className="info-card">
                        <span className="info-label">Color</span>
                        <p className="info-value">{animal.color}</p>
                      </div>
                    )}
                    {animal.sex && (
                      <div className="info-card">
                        <span className="info-label">Sex</span>
                        <p className={`info-value sex-display ${animal.sex}`}>
                          {animal.sex === 'male' ? '♂ Male' : '♀ Female'}
                        </p>
                      </div>
                    )}
                    <div className="info-card">
                      <span className="info-label">Date of Birth</span>
                      <p className="info-value">{animal.dateOfBirth}</p>
                    </div>
                    <div className="info-card">
                      <span className="info-label">Age</span>
                      <p className="info-value">{calculateAge(animal.dateOfBirth)} days</p>
                    </div>
                  </div>
                  
                  {animal.notes && (
                    <div className="info-card notes-card">
                      <span className="info-label">Notes</span>
                      <p className="notes-text">{animal.notes}</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="animal-page-sidebar">
              <div className="sidebar-card">
                <h3 className="sidebar-title">Photo</h3>
                {animal.image ? (
                  <img 
                    src={animal.image} 
                    alt={animal.name}
                    className="animal-photo"
                  />
                ) : (
                  <div className="animal-photo-placeholder">
                    <FileImage size={64} />
                  </div>
                )}
                {isEditing && (
                  <div className="photo-actions">
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleImageUpload}
                      accept="image/*"
                      style={{ display: 'none' }}
                    />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="btn btn-secondary full-width"
                    >
                      <Camera size={16} />
                      Change Photo
                    </button>
                  </div>
                )}
              </div>
              
              <div className="sidebar-card">
                <h3 className="sidebar-title">QR Code</h3>
                <div className="qr-container">
                  <QRCode value={`animal-${animal.id}`} size={140} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Main App Component
const AnimalTracker = () => {
  const [currentView, setCurrentView] = useState('animals');
  const [animals, setAnimals] = useState([]);
  const [selectedAnimal, setSelectedAnimal] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [isDark, setIsDark] = useState(themeManager.get() === 'dark');
  const [filterStatus, setFilterStatus] = useState('all');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const [newAnimal, setNewAnimal] = useState({
    name: '',
    species: 'rabbit',
    breed: '',
    color: '',
    sex: '',
    dateOfBirth: '',
    status: 'Active',
    notes: '',
    image: null
  });

  const fileInputRef = useRef();

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
    loadAnimals();
  }, [isDark]);

  const loadAnimals = async () => {
    try {
      const data = await api.getAnimals();
      setAnimals(data);
    } catch (error) {
      console.error('Error loading animals:', error);
      // Fallback to localStorage if API fails
      const localAnimals = JSON.parse(localStorage.getItem('animals') || '[]');
      setAnimals(localAnimals);
    } finally {
      setLoading(false);
    }
  };

  const toggleTheme = () => {
    const newTheme = isDark ? 'light' : 'dark';
    setIsDark(!isDark);
    themeManager.set(newTheme);
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (file) {
      const compressedFile = await compressImage(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setNewAnimal(prev => ({ ...prev, image: e.target.result }));
      };
      reader.readAsDataURL(compressedFile);
    }
  };

  // Generate random ID function
  const generateAnimalId = () => {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const numbers = '0123456789';
    
    // Generate format: AB-1234 (2 letters + 4 numbers)
    let id = '';
    for (let i = 0; i < 2; i++) {
      id += letters.charAt(Math.floor(Math.random() * letters.length));
    }
    id += '-';
    for (let i = 0; i < 4; i++) {
      id += numbers.charAt(Math.floor(Math.random() * numbers.length));
    }
    
    return id;
  };

  const addAnimal = async () => {
    const animal = {
      ...newAnimal,
      id: generateAnimalId(),
      createdAt: new Date().toISOString()
    };
    
    try {
      await api.createAnimal(animal);
      await loadAnimals();
    } catch (error) {
      console.error('Error creating animal:', error);
      // Fallback to localStorage
      const updatedAnimals = [...animals, animal];
      setAnimals(updatedAnimals);
      localStorage.setItem('animals', JSON.stringify(updatedAnimals));
    }
    
    setNewAnimal({
      name: '',
      species: 'rabbit',
      breed: '',
      color: '',
      sex: '',
      dateOfBirth: '',
      status: 'Active',
      notes: '',
      image: null
    });
    setShowAddForm(false);
  };

  const updateAnimal = async (updatedAnimal) => {
    try {
      await api.updateAnimal(updatedAnimal.id, updatedAnimal);
      await loadAnimals();
    } catch (error) {
      console.error('Error updating animal:', error);
      // Fallback to localStorage
      const updatedAnimals = animals.map(a => a.id === updatedAnimal.id ? updatedAnimal : a);
      setAnimals(updatedAnimals);
      localStorage.setItem('animals', JSON.stringify(updatedAnimals));
    }
    setSelectedAnimal(updatedAnimal);
  };

  const deleteAnimal = async (id) => {
    if (!window.confirm('Are you sure you want to delete this animal?')) return;
    
    try {
      await api.deleteAnimal(id);
      await loadAnimals();
    } catch (error) {
      console.error('Error deleting animal:', error);
      // Fallback to localStorage
      const updatedAnimals = animals.filter(a => a.id !== id);
      setAnimals(updatedAnimals);
      localStorage.setItem('animals', JSON.stringify(updatedAnimals));
    }
    setSelectedAnimal(null);
    setCurrentView('animals');
  };

  const filteredAnimals = animals.filter(animal => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = animal.name.toLowerCase().includes(searchLower) ||
                         animal.species.toLowerCase().includes(searchLower) ||
                         (animal.breed && animal.breed.toLowerCase().includes(searchLower)) ||
                         (animal.color && animal.color.toLowerCase().includes(searchLower)) ||
                         animal.id.includes(searchTerm);
    const matchesFilter = filterStatus === 'all' || animal.status.toLowerCase() === filterStatus.toLowerCase();
    return matchesSearch && matchesFilter;
  });

  if (selectedAnimal) {
    return (
      <AnimalPage
        animal={selectedAnimal}
        onBack={() => setSelectedAnimal(null)}
        onUpdate={updateAnimal}
        onDelete={deleteAnimal}
      />
    );
  }

  return (
    <div className="app">
      {/* Header */}
      <header className="header">
        <div className="header-content">
          <div className="logo">
            <h1>Animal Tracker</h1>
            <div className="status-dot"></div>
          </div>
          
          {/* Desktop Navigation */}
          <nav className="nav-desktop">
            <button
              onClick={() => setCurrentView('animals')}
              className={`nav-button ${currentView === 'animals' ? 'active' : ''}`}
            >
              <Users size={20} />
              Animals
            </button>
            <button
              onClick={() => setCurrentView('breeding')}
              className={`nav-button ${currentView === 'breeding' ? 'active' : ''}`}
            >
              <Calendar size={20} />
              Breeding
            </button>
            <button
              onClick={() => setCurrentView('hatching')}
              className={`nav-button ${currentView === 'hatching' ? 'active' : ''}`}
            >
              <Egg size={20} />
              Hatching
            </button>
          </nav>

          <div className="header-controls">
            {/* Theme Toggle */}
            <button onClick={toggleTheme} className="theme-toggle">
              {isDark ? <Sun size={20} /> : <Moon size={20} />}
            </button>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="mobile-menu-toggle"
            >
              <Menu size={20} />
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <nav className="nav-mobile">
            <button
              onClick={() => { setCurrentView('animals'); setMobileMenuOpen(false); }}
              className={`nav-button ${currentView === 'animals' ? 'active' : ''}`}
            >
              <Users size={20} />
              Animals
            </button>
            <button
              onClick={() => { setCurrentView('breeding'); setMobileMenuOpen(false); }}
              className={`nav-button ${currentView === 'breeding' ? 'active' : ''}`}
            >
              <Calendar size={20} />
              Breeding
            </button>
            <button
              onClick={() => { setCurrentView('hatching'); setMobileMenuOpen(false); }}
              className={`nav-button ${currentView === 'hatching' ? 'active' : ''}`}
            >
              <Egg size={20} />
              Hatching
            </button>
          </nav>
        )}
      </header>

      <main className="main">
        {currentView === 'animals' && (
          <div>
            {/* Search and Filter Bar */}
            <div className="search-bar">
              <div className="search-input-container">
                <Search className="search-icon" size={20} />
                <input
                  type="text"
                  placeholder="Search animals by name, species, breed, color, or ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="search-input"
                />
              </div>
              
              <div className="controls">
                <div className="filter-container">
                  <Filter className="filter-icon" size={20} />
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="filter-select"
                  >
                    <option value="all">All Status</option>
                    <option value="active">Active</option>
                    <option value="breeder">Breeder</option>
                    <option value="retired">Retired</option>
                  </select>
                </div>
                
                <button
                  onClick={() => setShowAddForm(true)}
                  className="btn btn-success"
                >
                  <Plus size={16} />
                  Add Animal
                </button>
              </div>
            </div>

            {/* Add Form Modal */}
            {showAddForm && (
              <div className="modal-overlay">
                <div className="modal">
                  <div className="modal-content">
                    <h2 className="modal-title">Add New Animal</h2>
                    <div className="form-grid">
                      <div className="form-group">
                        <label className="form-label">Animal ID</label>
                        <div className="id-display">
                          <span className="generated-id">{generateAnimalId()}</span>
                          <small className="id-note">Auto-generated</small>
                        </div>
                      </div>
                      <div className="form-group">
                        <label className="form-label">Name</label>
                        <input
                          type="text"
                          value={newAnimal.name}
                          onChange={(e) => setNewAnimal(prev => ({ ...prev, name: e.target.value }))}
                          className="form-input"
                          placeholder="Enter animal name"
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Species</label>
                        <select
                          value={newAnimal.species}
                          onChange={(e) => setNewAnimal(prev => ({ ...prev, species: e.target.value }))}
                          className="form-input"
                        >
                          <option value="rabbit">Rabbit</option>
                          <option value="quail">Quail</option>
                          <option value="chicken">Chicken</option>
                          <option value="other">Other</option>
                        </select>
                      </div>
                      <div className="form-group">
                        <label className="form-label">Breed</label>
                        <input
                          type="text"
                          value={newAnimal.breed}
                          onChange={(e) => setNewAnimal(prev => ({ ...prev, breed: e.target.value }))}
                          className="form-input"
                          placeholder="e.g., Holland Lop, New Zealand White"
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Color</label>
                        <input
                          type="text"
                          value={newAnimal.color}
                          onChange={(e) => setNewAnimal(prev => ({ ...prev, color: e.target.value }))}
                          className="form-input"
                          placeholder="e.g., White, Brown, Mixed"
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Sex</label>
                        <select
                          value={newAnimal.sex}
                          onChange={(e) => setNewAnimal(prev => ({ ...prev, sex: e.target.value }))}
                          className="form-input"
                        >
                          <option value="">Select Sex</option>
                          <option value="male">Male</option>
                          <option value="female">Female</option>
                        </select>
                      </div>
                      <div className="form-group">
                        <label className="form-label">Date of Birth</label>
                        <input
                          type="date"
                          value={newAnimal.dateOfBirth}
                          onChange={(e) => setNewAnimal(prev => ({ ...prev, dateOfBirth: e.target.value }))}
                          className="form-input"
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Status</label>
                        <select
                          value={newAnimal.status}
                          onChange={(e) => setNewAnimal(prev => ({ ...prev, status: e.target.value }))}
                          className="form-input"
                        >
                          <option value="Active">Active</option>
                          <option value="Breeder">Breeder</option>
                          <option value="Retired">Retired</option>
                        </select>
                      </div>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Notes</label>
                      <textarea
                        value={newAnimal.notes}
                        onChange={(e) => setNewAnimal(prev => ({ ...prev, notes: e.target.value }))}
                        rows="3"
                        className="form-input form-textarea"
                        placeholder="Additional notes..."
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Photo</label>
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleImageUpload}
                        accept="image/*"
                        style={{ display: 'none' }}
                      />
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="btn btn-secondary full-width"
                      >
                        <Camera size={16} />
                        Add Photo
                      </button>
                      {newAnimal.image && (
                        <img src={newAnimal.image} alt="Preview" className="image-preview" />
                      )}
                    </div>
                    <div className="form-actions">
                      <button
                        onClick={() => setShowAddForm(false)}
                        className="btn-ghost"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={addAnimal}
                        disabled={!newAnimal.name || !newAnimal.dateOfBirth}
                        className="btn btn-success"
                        style={{ opacity: (!newAnimal.name || !newAnimal.dateOfBirth) ? 0.5 : 1 }}
                      >
                        Add Animal
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Animal Grid */}
            {loading ? (
              <div className="loading-state">Loading animals...</div>
            ) : (
              <>
                <div className="animal-grid">
                  {filteredAnimals.map(animal => (
                    <div
                      key={animal.id}
                      className="animal-card"
                      onClick={() => setSelectedAnimal(animal)}
                    >
                      <div className="animal-image">
                        {animal.image ? (
                          <img src={animal.image} alt={animal.name} />
                        ) : (
                          <div className="animal-image-placeholder">
                            <FileImage size={64} />
                          </div>
                        )}
                        <span className={`status-badge ${getStatusColor(animal.status)}`}>
                          {animal.status}
                        </span>
                      </div>
                      <div className="animal-info">
                        <h3 className="animal-name">{animal.name}</h3>
                        <div className="animal-details">
                          <div className="animal-detail">
                            <span className="animal-detail-label">ID:</span> {animal.id}
                          </div>
                          <div className="animal-detail">
                            <span className="animal-detail-label">Species:</span> <span style={{ textTransform: 'capitalize' }}>{animal.species}</span>
                          </div>
                          {animal.breed && (
                            <div className="animal-detail">
                              <span className="animal-detail-label">Breed:</span> {animal.breed}
                            </div>
                          )}
                          {animal.color && (
                            <div className="animal-detail">
                              <span className="animal-detail-label">Color:</span> {animal.color}
                            </div>
                          )}
                          {animal.sex && (
                            <div className="animal-detail">
                              <span className="animal-detail-label">Sex:</span> 
                              <span className={`sex-indicator ${animal.sex}`}>
                                {animal.sex === 'male' ? '♂ Male' : '♀ Female'}
                              </span>
                            </div>
                          )}
                          <div className="animal-detail">
                            <span className="animal-detail-label">DOB:</span> {animal.dateOfBirth}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {filteredAnimals.length === 0 && (
                  <div className="empty-state">
                    <FileImage size={64} />
                    <h3>No animals found</h3>
                    <p>Try adjusting your search or filter criteria, or add a new animal.</p>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {currentView === 'breeding' && <BreedingPage animals={animals} />}
        {currentView === 'hatching' && <HatchingPage />}
      </main>
    </div>
  );
};

export default AnimalTracker;