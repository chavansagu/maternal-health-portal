import React, { useState, useEffect } from 'react';
import { Icon } from '@iconify/react/dist/iconify.js';
import { Link } from 'react-router-dom';
import { adminAPI, authAPI, deliveryPointAPI } from '../services/api';
import { getUserRole } from '../services/auth';
import { validateMobileNumber, formatMobileNumberInput } from '../utils/mobileValidation';
import { formatDate } from '../utils/dateFormatter';

const AdministrativeManagementLayer = () => {
    const [activeTab, setActiveTab] = useState('blocks');
    const [blocks, setBlocks] = useState([]);
    const [wards, setWards] = useState([]);
    const [subCentres, setSubCentres] = useState([]);
    const [usgCentres, setUSGCentres] = useState([]);
    const [districts, setDistricts] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showViewModal, setShowViewModal] = useState(false);
    const [selectedBlock, setSelectedBlock] = useState(null);
    const [selectedWard, setSelectedWard] = useState(null);
    const [selectedSubCentre, setSelectedSubCentre] = useState(null);
    const [selectedUSGCentre, setSelectedUSGCentre] = useState(null);
    const [selectedBlockIds, setSelectedBlockIds] = useState([]);
    const [selectedWardIds, setSelectedWardIds] = useState([]);
    const [districtSearch, setDistrictSearch] = useState('');
    const [blockSearch, setBlockSearch] = useState('');
    const [showDistrictDropdown, setShowDistrictDropdown] = useState(false);
    const [showBlockDropdown, setShowBlockDropdown] = useState(false);
    const [wardSearch, setWardSearch] = useState('');
    const [showWardDropdown, setShowWardDropdown] = useState(false);
    const [viewMappings, setViewMappings] = useState({ blocks: [], wards: [] });
    const [loadingMappings, setLoadingMappings] = useState(false);
    const [formData, setFormData] = useState({ name: '', name_regional: '', code: '', district_id: '', block_id: '', ward_id: '', address: '', contact_number: '', contact_person_name: '', email: '', google_map_url: '', is_empanelled: true, is_private: false, block_ids: [], ward_ids: [] });
    const [blockCurrentPage, setBlockCurrentPage] = useState(1);
    const [currentPage, setCurrentPage] = useState(1);
    const [wardCurrentPage, setWardCurrentPage] = useState(1);
    const [subCentreCurrentPage, setSubCentreCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(25);
    const [blockItemsPerPage, setBlockItemsPerPage] = useState(25);
    const [wardItemsPerPage, setWardItemsPerPage] = useState(25);
    const [subCentreItemsPerPage, setSubCentreItemsPerPage] = useState(25);
    const [usgCentreItemsPerPage, setUSGCentreItemsPerPage] = useState(25);
    const [blockSearchTerm, setBlockSearchTerm] = useState('');
    const [wardSearchTerm, setWardSearchTerm] = useState('');
    const [subCentreSearchTerm, setSubCentreSearchTerm] = useState('');
    const [usgCentreSearchTerm, setUSGCentreSearchTerm] = useState('');
    const [deliveryPoints, setDeliveryPoints] = useState([]);
    const [selectedDeliveryPoint, setSelectedDeliveryPoint] = useState(null);
    const [dpCurrentPage, setDPCurrentPage] = useState(1);
    const [dpItemsPerPage, setDPItemsPerPage] = useState(25);
    const [dpSearchTerm, setDPSearchTerm] = useState('');
    const [totalBlocks, setTotalBlocks] = useState(0);
    const [totalUSGCentres, setTotalUSGCentres] = useState(0);
    const [totalWards, setTotalWards] = useState(0);
    const [totalSubCentres, setTotalSubCentres] = useState(0);
    const [mobileError, setMobileError] = useState('');
    const [currentUser, setCurrentUser] = useState(null);
    const userRole = getUserRole();

    // Fetch current user info on mount
    useEffect(() => {
        const fetchCurrentUser = async () => {
            try {
                const user = await authAPI.getCurrentUser();
                setCurrentUser(user);
            } catch (error) {
                console.error('Error fetching current user:', error);
            }
        };
        fetchCurrentUser();
    }, []);

    // Auto-select first available tab based on user role
    useEffect(() => {
        if (userRole === 'block' && activeTab === 'blocks') {
            setActiveTab('wards'); // Block users start with wards tab
        }
    }, [userRole]);

    useEffect(() => {
        if (activeTab === 'blocks') {
            fetchBlocks();
            fetchDistricts();
        } else if (activeTab === 'wards') {
            fetchWards();
            fetchBlocks();
        } else if (activeTab === 'sub-centres') {
            fetchSubCentres();
            fetchBlocks();
            fetchWards();
        } else if (activeTab === 'usg-centres') {
            setCurrentPage(1);
            fetchDistricts();
            fetchBlocks();
            fetchWards();
        } else if (activeTab === 'delivery-points') {
            fetchDeliveryPoints();
            fetchDistricts();
            fetchBlocks();
        }
    }, [activeTab]);

    useEffect(() => {
        if (activeTab === 'usg-centres') {
            fetchUSGCentres();
        }
    }, [activeTab]);

    const fetchBlocks = async () => {
        try {
            setLoading(true);
            const data = await adminAPI.getBlocks();
            setBlocks(data);
            setTotalBlocks(data.length);
        } catch (error) {
            console.error('Error fetching blocks:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchDistricts = async () => {
        try {
            const data = await adminAPI.getDistricts();
            setDistricts(data);
            
            // Auto-select first district by default
            if (data && data.length > 0) {
                const firstDistrict = data[0];
                setDistrictSearch(firstDistrict.name);
                setFormData(prev => ({...prev, district_id: firstDistrict.id}));
                } else if (data.length === 1) {
                    // If only one district available, select it by default
                    setDistrictSearch(data[0].name);
                    setFormData(prev => ({...prev, district_id: data[0].id}));
                }
            }
        } catch (error) {
            console.error('Error fetching districts:', error);
        }
    };

    const fetchWards = async () => {
        try {
            setLoading(true);
            const response = await adminAPI.getWards(0, 10000);
            const allWards = response.items || response.wards || response.data || response || [];
            setWards(allWards);
            setTotalWards(allWards.length);
        } catch (error) {
            console.error('Error fetching wards:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchSubCentres = async () => {
        try {
            setLoading(true);
            const response = await adminAPI.getSubCentres(0, 10000);
            const allCentres = response.items || response.sub_centres || response.data || response || [];
            setSubCentres(allCentres);
            setTotalSubCentres(allCentres.length);
        } catch (error) {
            console.error('Error fetching sub-centres:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchUSGCentres = async () => {
        try {
            setLoading(true);
            const response = await adminAPI.getUSGCentres(0, 10000);
            const allCentres = response.items || response;
            setUSGCentres(allCentres);
            setTotalUSGCentres(allCentres.length);
        } catch (error) {
            console.error('Error fetching USG centres:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchDeliveryPoints = async () => {
        try {
            setLoading(true);
            const data = await deliveryPointAPI.getDeliveryPoints();
            setDeliveryPoints(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Error fetching delivery points:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAddBlock = async (e) => {
        e.preventDefault();
        try {
            await adminAPI.createBlock({
                name: formData.name,
                name_regional: formData.name_regional || undefined,
                code: formData.code,
                district_id: Number(formData.district_id)
            });
            setShowAddModal(false);
            setFormData({ name: '', name_regional: '', code: '', district_id: '', block_id: '', address: '', contact_number: '', email: '', is_empanelled: true, is_private: false, block_ids: [], ward_ids: [] });
            fetchBlocks();
            alert('Block created successfully');
        } catch (error) {
            console.error('Error creating block:', error);
            alert('Failed to create block');
        }
    };

    const handleAddWard = async (e) => {
        e.preventDefault();
        try {
            await adminAPI.createWard({
                name: formData.name,
                name_regional: formData.name_regional || undefined,
                code: formData.code,
                block_id: Number(formData.block_id)
            });
            setShowAddModal(false);
            setFormData({ name: '', name_regional: '', code: '', district_id: '', block_id: '', address: '', contact_number: '', email: '', is_empanelled: true, is_private: false, block_ids: [], ward_ids: [] });
            fetchWards();
            alert('Ward created successfully');
        } catch (error) {
            console.error('Error creating ward:', error);
            alert('Failed to create ward');
        }
    };

    const handleAddSubCentre = async (e) => {
        e.preventDefault();
        
        const mobileValidation = validateMobileNumber(formData.contact_number);
        if (!mobileValidation.isValid) {
            setMobileError(mobileValidation.error);
            alert('Please enter a valid mobile number');
            return;
        }
        
        try {
            const subCentreData = {
                name: formData.name,
                code: formData.code,
                block_id: Number(formData.block_id),
                address: formData.address,
                contact_number: formData.contact_number
            };
            
            const response = await adminAPI.createSubCentre(subCentreData);
            
            // Automatically map the selected block
            const blockId = Number(formData.block_id);
            try {
                await adminAPI.mapBlocksToSubCentre(response.id, [blockId]);
            } catch (error) {
                console.warn('Block mapping failed:', error);
            }
            
            // Automatically map all wards belonging to the selected block
            const wardsInBlock = wards.filter(ward => ward.block_id === blockId);
            if (wardsInBlock.length > 0) {
                const wardIds = wardsInBlock.map(ward => ward.id);
                try {
                    await adminAPI.mapWardsToSubCentre(response.id, wardIds);
                } catch (error) {
                    console.warn('Ward mapping failed:', error);
                }
            }
            
            setShowAddModal(false);
            setFormData({ name: '', code: '', district_id: '', block_id: '', address: '', contact_number: '', email: '', is_empanelled: true, is_private: false, block_ids: [], ward_ids: [] });
            setSelectedBlockIds([]);
            setSelectedWardIds([]);
            setMobileError('');
            fetchSubCentres();
            alert('Sub-Centre created successfully');
        } catch (error) {
            console.error('Error creating sub-centre:', error);
            alert('Failed to create sub-centre');
        }
    };

    const handleAddUSGCentre = async (e) => {
        e.preventDefault();
        
        const mobileValidation = validateMobileNumber(formData.contact_number);
        if (!mobileValidation.isValid) {
            setMobileError(mobileValidation.error);
            alert('Please enter a valid mobile number');
            return;
        }
        
        try {
            await adminAPI.createUSGCentre({
                name: formData.name,
                code: formData.code,
                address: formData.address,
                contact_number: formData.contact_number,
                contact_person_name: formData.contact_person_name || undefined,
                email: formData.email,
                google_map_url: formData.google_map_url || undefined,
                is_empanelled: formData.is_empanelled,
                is_private: formData.is_private,
                district_id: Number(formData.district_id),
                block_ids: selectedBlockIds.length > 0 ? selectedBlockIds : undefined,
                ward_id: formData.ward_id ? Number(formData.ward_id) : undefined
            });
            setShowAddModal(false);
            setFormData({ name: '', code: '', district_id: '', block_id: '', ward_id: '', address: '', contact_number: '', contact_person_name: '', email: '', google_map_url: '', is_empanelled: true, is_private: false, block_ids: [], ward_ids: [] });
            setSelectedBlockIds([]);
            setMobileError('');
            fetchUSGCentres();
            alert('USG Centre created successfully');
        } catch (error) {
            console.error('Error creating USG centre:', error);
            alert('Failed to create USG centre');
        }
    };

    const handleEditBlock = async (e) => {
        e.preventDefault();
        try {
            await adminAPI.updateBlock(selectedBlock.id, {
                name: formData.name,
                name_regional: formData.name_regional || undefined,
                code: formData.code,
                district_id: Number(formData.district_id),
                is_active: selectedBlock.is_active
            });
            setShowEditModal(false);
            resetEditState();
            fetchBlocks();
            alert('Block updated successfully');
        } catch (error) {
            console.error('Error updating block:', error);
            alert('Failed to update block');
        }
    };

    const handleEditWard = async (e) => {
        e.preventDefault();
        try {
            await adminAPI.updateWard(selectedWard.id, {
                name: formData.name,
                name_regional: formData.name_regional || undefined,
                code: formData.code,
                block_id: Number(formData.block_id),
                is_active: selectedWard.is_active
            });
            setShowEditModal(false);
            resetEditState();
            fetchWards();
            alert('Ward updated successfully');
        } catch (error) {
            console.error('Error updating ward:', error);
            alert('Failed to update ward');
        }
    };

    const handleEditSubCentre = async (e) => {
        e.preventDefault();
        
        const mobileValidation = validateMobileNumber(formData.contact_number);
        if (!mobileValidation.isValid) {
            setMobileError(mobileValidation.error);
            alert('Please enter a valid mobile number');
            return;
        }
        
        try {
            // Only update basic sub-centre details (block_id remains unchanged)
            await adminAPI.updateSubCentre(selectedSubCentre.id, {
                name: formData.name,
                code: formData.code,
                block_id: Number(formData.block_id),
                address: formData.address,
                contact_number: formData.contact_number,
                is_active: selectedSubCentre.is_active
            });
            
            setShowEditModal(false);
            resetEditState();
            setMobileError('');
            fetchSubCentres();
            alert('Sub-Centre updated successfully');
        } catch (error) {
            console.error('Error updating sub-centre:', error);
            alert('Failed to update sub-centre');
        }
    };

    const handleEditUSGCentre = async (e) => {
        e.preventDefault();
        
        const mobileValidation = validateMobileNumber(formData.contact_number);
        if (!mobileValidation.isValid) {
            setMobileError(mobileValidation.error);
            alert('Please enter a valid mobile number');
            return;
        }
        
        try {
            await adminAPI.updateUSGCentre(selectedUSGCentre.id, {
                name: formData.name,
                code: formData.code,
                address: formData.address,
                contact_number: formData.contact_number,
                contact_person_name: formData.contact_person_name || undefined,
                email: formData.email,
                google_map_url: formData.google_map_url || undefined,
                is_empanelled: formData.is_empanelled,
                is_private: formData.is_private,
                district_id: Number(formData.district_id),
                block_ids: selectedBlockIds.length > 0 ? selectedBlockIds : undefined,
                is_active: selectedUSGCentre.is_active
            });
            setShowEditModal(false);
            resetEditState();
            setMobileError('');
            fetchUSGCentres();
            alert('USG Centre updated successfully');
        } catch (error) {
            console.error('Error updating USG centre:', error);
            alert('Failed to update USG centre');
        }
    };

    const handleDeleteBlock = async () => {
        try {
            await adminAPI.deleteBlock(selectedBlock.id);
            setShowDeleteModal(false);
            setSelectedBlock(null);
            fetchBlocks();
            alert('Block deactivated successfully');
        } catch (error) {
            console.error('Error deleting block:', error);
            alert('Failed to deactivate block');
        }
    };

    const handleDeleteWard = async () => {
        try {
            await adminAPI.deleteWard(selectedWard.id);
            setShowDeleteModal(false);
            setSelectedWard(null);
            fetchWards();
            alert('Ward deactivated successfully');
        } catch (error) {
            console.error('Error deleting ward:', error);
            alert('Failed to deactivate ward');
        }
    };

    const handleDeleteSubCentre = async () => {
        try {
            await adminAPI.deleteSubCentre(selectedSubCentre.id);
            setShowDeleteModal(false);
            setSelectedSubCentre(null);
            fetchSubCentres();
            alert('Sub-Centre deactivated successfully');
        } catch (error) {
            console.error('Error deleting sub-centre:', error);
            alert('Failed to deactivate sub-centre');
        }
    };

    const handleDeleteUSGCentre = async () => {
        try {
            await adminAPI.deleteUSGCentre(selectedUSGCentre.id);
            setShowDeleteModal(false);
            setSelectedUSGCentre(null);
            fetchUSGCentres();
            alert('USG Centre deactivated successfully');
        } catch (error) {
            console.error('Error deleting USG centre:', error);
            alert('Failed to deactivate USG centre');
        }
    };

    const handleAddDeliveryPoint = async (e) => {
        e.preventDefault();
        try {
            await deliveryPointAPI.createDeliveryPoint({
                name: formData.name,
                code: formData.code,
                address: formData.address,
                contact_number: formData.contact_number,
                contact_person_name: formData.contact_person_name || undefined,
                district_id: Number(formData.district_id),
                block_id: formData.block_id ? Number(formData.block_id) : undefined,
            });
            setShowAddModal(false);
            setFormData({ name: '', code: '', district_id: '', block_id: '', address: '', contact_number: '', contact_person_name: '', email: '', google_map_url: '', is_empanelled: true, is_private: false, block_ids: [], ward_ids: [] });
            fetchDeliveryPoints();
            alert('Delivery Point created successfully');
        } catch (error) {
            console.error('Error creating delivery point:', error);
            alert('Failed to create delivery point');
        }
    };

    const handleEditDeliveryPoint = async (e) => {
        e.preventDefault();
        try {
            await deliveryPointAPI.updateDeliveryPoint(selectedDeliveryPoint.id, {
                name: formData.name,
                code: formData.code,
                address: formData.address,
                contact_number: formData.contact_number,
                contact_person_name: formData.contact_person_name || undefined,
                block_id: formData.block_id ? Number(formData.block_id) : undefined,
            });
            setShowEditModal(false);
            setSelectedDeliveryPoint(null);
            setFormData({ name: '', code: '', district_id: '', block_id: '', address: '', contact_number: '', contact_person_name: '', email: '', google_map_url: '', is_empanelled: true, is_private: false, block_ids: [], ward_ids: [] });
            fetchDeliveryPoints();
            alert('Delivery Point updated successfully');
        } catch (error) {
            console.error('Error updating delivery point:', error);
            alert('Failed to update delivery point');
        }
    };

    const handleDeleteDeliveryPoint = async () => {
        try {
            await deliveryPointAPI.deleteDeliveryPoint(selectedDeliveryPoint.id);
            setShowDeleteModal(false);
            setSelectedDeliveryPoint(null);
            fetchDeliveryPoints();
            alert('Delivery Point deactivated successfully');
        } catch (error) {
            console.error('Error deleting delivery point:', error);
            alert('Failed to deactivate delivery point');
        }
    };



    const resetEditState = () => {
        setSelectedBlock(null);
        setSelectedWard(null);
        setSelectedSubCentre(null);
        setSelectedUSGCentre(null);
        setSelectedBlockIds([]);
        setSelectedWardIds([]);
        setFormData({ name: '', name_regional: '', code: '', district_id: '', block_id: '', address: '', contact_number: '', email: '', is_empanelled: true, is_private: false, block_ids: [], ward_ids: [] });
    };

    const openEditModal = (block) => {
        resetEditState();
        setSelectedBlock(block);
        setFormData({
            name: block.name,
            name_regional: block.name_regional || '',
            code: block.code,
            district_id: block.district_id,
            block_id: '',
            address: '',
            contact_number: '',
            email: '',
            is_empanelled: true,
            is_private: false
        });
        setShowEditModal(true);
    };

    const openEditWardModal = (ward) => {
        resetEditState();
        setSelectedWard(ward);
        setFormData({
            name: ward.name,
            name_regional: ward.name_regional || '',
            code: ward.code,
            district_id: '',
            block_id: ward.block_id,
            address: '',
            contact_number: '',
            email: '',
            is_empanelled: true,
            is_private: false
        });
        setShowEditModal(true);
    };

    const openEditSubCentreModal = async (subCentre) => {
        resetEditState();
        setSelectedSubCentre(subCentre);
        setFormData({
            name: subCentre.name,
            code: subCentre.code,
            district_id: '',
            block_id: subCentre.block_id,
            address: subCentre.address,
            contact_number: subCentre.contact_number,
            email: '',
            is_empanelled: true,
            is_private: false,
            block_ids: [],
            ward_ids: []
        });
        
        // Fetch existing mappings
        try {
            const blockMappings = await adminAPI.getSubCentreBlocks(subCentre.id);
            const wardMappings = await adminAPI.getSubCentreWards(subCentre.id);
            setSelectedBlockIds(blockMappings.map(m => m.block_id) || []);
            setSelectedWardIds(wardMappings.map(m => m.ward_id) || []);
        } catch (error) {
            console.warn('Failed to fetch existing mappings:', error);
        }
        
        setShowEditModal(true);
    };

    const openEditUSGCentreModal = (usgCentre) => {
        resetEditState();
        setSelectedUSGCentre(usgCentre);
        setFormData({
            name: usgCentre.name,
            code: usgCentre.code,
            district_id: usgCentre.district_id,
            block_id: '',
            address: usgCentre.address,
            contact_number: usgCentre.contact_number,
            contact_person_name: usgCentre.contact_person_name || '',
            email: usgCentre.email,
            google_map_url: usgCentre.google_map_url || '',
            is_empanelled: usgCentre.is_empanelled,
            is_private: usgCentre.is_private
        });
        setSelectedBlockIds(usgCentre.block_ids || []);
        setShowEditModal(true);
    };

    const canCreate = (activeTab === 'blocks') 
        ? (userRole === 'district') 
        : (activeTab === 'wards')
        ? (userRole === 'district' || userRole === 'block')
        : (activeTab === 'sub-centres') 
        ? (userRole === 'district' || userRole === 'block') 
        : (activeTab === 'usg-centres')
        ? (userRole === 'district')
        : (activeTab === 'delivery-points')
        ? (userRole === 'district')
        : false;
    
    const canEdit = (activeTab === 'blocks') 
        ? (userRole === 'district') 
        : (activeTab === 'wards')
        ? (userRole === 'district' || userRole === 'block')
        : (activeTab === 'sub-centres') 
        ? (userRole === 'district' || userRole === 'block' || userRole === 'sub_centre') 
        : (activeTab === 'usg-centres')
        ? (userRole === 'district' || userRole === 'usg_centre')
        : (activeTab === 'delivery-points')
        ? (userRole === 'district')
        : false;
    
    const canDelete = (activeTab === 'blocks') 
        ? (userRole === 'district') 
        : (activeTab === 'wards')
        ? (userRole === 'district' || userRole === 'block')
        : (activeTab === 'sub-centres') 
        ? (userRole === 'district' || userRole === 'block') 
        : (activeTab === 'usg-centres')
        ? (userRole === 'district')
        : (activeTab === 'delivery-points')
        ? (userRole === 'district')
        : false;
    const hasAnyAction = canEdit || canDelete;



    const trimText = (text, maxLength = 15) => {
        if (!text) return '';
        return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
    };

    // Smart pagination function to show only relevant page numbers
    const getVisiblePages = (currentPage, totalPages) => {
        const delta = 2; // Show 2 pages before and after current page
        const range = [];
        const rangeWithDots = [];

        for (let i = Math.max(2, currentPage - delta); i <= Math.min(totalPages - 1, currentPage + delta); i++) {
            range.push(i);
        }

        if (currentPage - delta > 2) {
            rangeWithDots.push(1, '...');
        } else {
            rangeWithDots.push(1);
        }

        rangeWithDots.push(...range);

        if (currentPage + delta < totalPages - 1) {
            rangeWithDots.push('...', totalPages);
        } else {
            rangeWithDots.push(totalPages);
        }

        return rangeWithDots.filter((item, index, arr) => arr.indexOf(item) === index);
    };

    // Filter functions for search
    const getFilteredBlocks = () => {
        if (!blockSearchTerm) return blocks;
        return blocks.filter(block => 
            block.name?.toLowerCase().includes(blockSearchTerm.toLowerCase()) ||
            block.code?.toLowerCase().includes(blockSearchTerm.toLowerCase()) ||
            districts.find(d => d.id === block.district_id)?.name?.toLowerCase().includes(blockSearchTerm.toLowerCase())
        );
    };

    const getFilteredWards = () => {
        let filtered = wards;

        // Block user: show only wards belonging to their block
        if (userRole === 'block' && currentUser?.block_id) {
            filtered = filtered.filter(ward => ward.block_id === currentUser.block_id);
        }

        if (!wardSearchTerm) return filtered;
        return filtered.filter(ward =>
            ward.name?.toLowerCase().includes(wardSearchTerm.toLowerCase()) ||
            ward.code?.toLowerCase().includes(wardSearchTerm.toLowerCase()) ||
            blocks.find(b => b.id === ward.block_id)?.name?.toLowerCase().includes(wardSearchTerm.toLowerCase())
        );
    };

    const getFilteredSubCentres = () => {
        let filtered = subCentres;

        // Block user: show only sub-centres belonging to their block
        if (userRole === 'block' && currentUser?.block_id) {
            filtered = filtered.filter(subCentre => subCentre.block_id === currentUser.block_id);
        }

        if (!subCentreSearchTerm) return filtered;
        return filtered.filter(subCentre =>
            subCentre.name?.toLowerCase().includes(subCentreSearchTerm.toLowerCase()) ||
            subCentre.code?.toLowerCase().includes(subCentreSearchTerm.toLowerCase()) ||
            subCentre.address?.toLowerCase().includes(subCentreSearchTerm.toLowerCase()) ||
            subCentre.contact_number?.includes(subCentreSearchTerm) ||
            blocks.find(b => b.id === subCentre.block_id)?.name?.toLowerCase().includes(subCentreSearchTerm.toLowerCase())
        );
    };

    const getFilteredUSGCentres = () => {
        let filtered = usgCentres;

        // Block user: show only USG centres that cover their block
        if (userRole === 'block' && currentUser?.block_id) {
            filtered = filtered.filter(usgCentre =>
                usgCentre.block_ids && usgCentre.block_ids.includes(currentUser.block_id)
            );
        }

        if (!usgCentreSearchTerm) return filtered;
        return filtered.filter(usgCentre =>
            usgCentre.name?.toLowerCase().includes(usgCentreSearchTerm.toLowerCase()) ||
            usgCentre.code?.toLowerCase().includes(usgCentreSearchTerm.toLowerCase()) ||
            districts.find(d => d.id === usgCentre.district_id)?.name?.toLowerCase().includes(usgCentreSearchTerm.toLowerCase()) ||
            (usgCentre.block_ids && usgCentre.block_ids.some(blockId =>
                blocks.find(b => b.id === blockId)?.name?.toLowerCase().includes(usgCentreSearchTerm.toLowerCase())
            ))
        );
    };

    return (
        <div className="card h-100 p-0 radius-12">
            <div className="card-body p-24">
                {/* Tabs Navigation with Controls */}
                <div className="d-flex justify-content-between align-items-start mb-20 flex-wrap gap-2">
                    <div className="d-flex align-items-center flex-wrap gap-3">
                        <ul className="nav border-gradient-tab nav-pills" id="pills-tab" role="tablist" style={{flexWrap: 'wrap'}}>
                            {/* Blocks Tab - Only for District users */}
                            {userRole === 'district' && (
                                <li className="nav-item" role="presentation">
                                    <button
                                        className={`nav-link ${activeTab === 'blocks' ? 'active' : ''}`}
                                        onClick={() => setActiveTab('blocks')}
                                        type="button"
                                    >
                                        Blocks
                                    </button>
                                </li>
                            )}
                            <li className="nav-item" role="presentation">
                                <button
                                    className={`nav-link ${activeTab === 'wards' ? 'active' : ''}`}
                                    onClick={() => setActiveTab('wards')}
                                    type="button"
                                >
                                    Wards/Villages
                                </button>
                            </li>
                            <li className="nav-item" role="presentation">
                                <button
                                    className={`nav-link ${activeTab === 'sub-centres' ? 'active' : ''}`}
                                    onClick={() => setActiveTab('sub-centres')}
                                    type="button"
                                >
                                    Sub-Centres
                                </button>
                            </li>
                            <li className="nav-item" role="presentation">
                                <button
                                    className={`nav-link ${activeTab === 'usg-centres' ? 'active' : ''}`}
                                    onClick={() => setActiveTab('usg-centres')}
                                    type="button"
                                >
                                    USG Centres
                                </button>
                            </li>
                            {userRole === 'district' && (
                                <li className="nav-item" role="presentation">
                                    <button
                                        className={`nav-link ${activeTab === 'delivery-points' ? 'active' : ''}`}
                                        onClick={() => setActiveTab('delivery-points')}
                                        type="button"
                                    >
                                        Delivery Points
                                    </button>
                                </li>
                            )}
                        </ul>
                        
                        {/* Pagination Size Selector */}
                        <div className="d-flex align-items-center gap-2">
                            <select 
                                className="form-select form-select-sm" 
                                style={{ width: 'auto' }}
                                value={activeTab === 'blocks' ? blockItemsPerPage : activeTab === 'wards' ? wardItemsPerPage : activeTab === 'sub-centres' ? subCentreItemsPerPage : activeTab === 'delivery-points' ? dpItemsPerPage : usgCentreItemsPerPage}
                                onChange={(e) => {
                                    const newSize = Number(e.target.value);
                                    if (activeTab === 'blocks') {
                                        setBlockItemsPerPage(newSize);
                                        setBlockCurrentPage(1);
                                    } else if (activeTab === 'wards') {
                                        setWardItemsPerPage(newSize);
                                        setWardCurrentPage(1);
                                    } else if (activeTab === 'sub-centres') {
                                        setSubCentreItemsPerPage(newSize);
                                        setSubCentreCurrentPage(1);
                                    } else if (activeTab === 'delivery-points') {
                                        setDPItemsPerPage(newSize);
                                        setDPCurrentPage(1);
                                    } else {
                                        setUSGCentreItemsPerPage(newSize);
                                        setCurrentPage(1);
                                    }
                                }}
                            >
                                <option value={10}>10</option>
                                <option value={25}>25</option>
                                <option value={50}>50</option>
                                <option value={100}>100</option>
                            </select>
                            <span className="text-sm text-secondary-light">entries</span>
                        </div>
                        
                        {/* Search Input */}
                        <div className="position-relative">
                            <input
                                type="text"
                                className="form-control form-control-sm"
                                placeholder={`Search ${activeTab === 'blocks' ? 'blocks' : activeTab === 'wards' ? 'wards' : activeTab === 'sub-centres' ? 'sub-centres' : activeTab === 'delivery-points' ? 'delivery points' : 'USG centres'}...`}
                                value={activeTab === 'blocks' ? blockSearchTerm : activeTab === 'wards' ? wardSearchTerm : activeTab === 'sub-centres' ? subCentreSearchTerm : activeTab === 'delivery-points' ? dpSearchTerm : usgCentreSearchTerm}
                                onChange={(e) => {
                                    if (activeTab === 'blocks') {
                                        setBlockSearchTerm(e.target.value);
                                        setBlockCurrentPage(1);
                                    } else if (activeTab === 'wards') {
                                        setWardSearchTerm(e.target.value);
                                        setWardCurrentPage(1);
                                    } else if (activeTab === 'sub-centres') {
                                        setSubCentreSearchTerm(e.target.value);
                                        setSubCentreCurrentPage(1);
                                    } else if (activeTab === 'delivery-points') {
                                        setDPSearchTerm(e.target.value);
                                        setDPCurrentPage(1);
                                    } else {
                                        setUSGCentreSearchTerm(e.target.value);
                                        setCurrentPage(1);
                                    }
                                }}
                                style={{ width: '250px', paddingLeft: '35px' }}
                            />
                            <Icon 
                                icon="ion:search-outline" 
                                className="position-absolute start-0 top-50 translate-middle-y ms-3 text-secondary-light"
                            />
                        </div>
                        
                        {/* Clear Search Button */}
                        {((activeTab === 'blocks' && blockSearchTerm) || 
                          (activeTab === 'wards' && wardSearchTerm) || 
                          (activeTab === 'sub-centres' && subCentreSearchTerm) || 
                          (activeTab === 'usg-centres' && usgCentreSearchTerm) ||
                          (activeTab === 'delivery-points' && dpSearchTerm)) && (
                            <button
                                className="btn btn-sm btn-outline-secondary"
                                onClick={() => {
                                    if (activeTab === 'blocks') {
                                        setBlockSearchTerm('');
                                        setBlockCurrentPage(1);
                                    } else if (activeTab === 'wards') {
                                        setWardSearchTerm('');
                                        setWardCurrentPage(1);
                                    } else if (activeTab === 'sub-centres') {
                                        setSubCentreSearchTerm('');
                                        setSubCentreCurrentPage(1);
                                    } else if (activeTab === 'delivery-points') {
                                        setDPSearchTerm('');
                                        setDPCurrentPage(1);
                                    } else {
                                        setUSGCentreSearchTerm('');
                                        setCurrentPage(1);
                                    }
                                }}
                                title="Clear search"
                            >
                                <Icon icon="material-symbols:close" />
                            </button>
                        )}
                    </div>

                    {/* Add New Button */}
                    {canCreate && (
                        <button 
                            className="btn btn-primary text-sm btn-sm px-12 py-12 radius-8 d-flex align-items-center gap-2"
                            onClick={() => {
                                setFormData({ name: '', name_regional: '', code: '', district_id: '', block_id: '', address: '', contact_number: '', email: '', is_empanelled: true, is_private: false, block_ids: [], ward_ids: [] });
                                setSelectedBlockIds([]);
                                setSelectedWardIds([]);
                                
                                // Auto-select first district by default
                                if (districts && districts.length > 0) {
                                    const firstDistrict = districts[0];
                                    setDistrictSearch(firstDistrict.name);
                                    setFormData(prev => ({...prev, district_id: firstDistrict.id}));
                                    } else if (districts.length === 1) {
                                        setDistrictSearch(districts[0].name);
                                        setFormData(prev => ({...prev, district_id: districts[0].id}));
                                    } else {
                                        setDistrictSearch('');
                                    }
                                } else {
                                    setDistrictSearch('');
                                }
                                
                                setBlockSearch('');
                                setWardSearch('');
                                setShowAddModal(true);
                            }}
                        >
                            <Icon icon="ic:baseline-plus" className="icon text-xl line-height-1" />
                            Add New
                        </button>
                    )}
                </div>

                {/* Tab Content */}
                <div className="tab-content" id="pills-tabContent">
                    <div className="tab-pane fade show active">
                        <div className="card basic-data-table">
                            <div className="card-body">
                                {activeTab === 'blocks' && (
                                    <>

                                        {loading ? (
                                            <div className="text-center py-4">
                                                <div className="spinner-border text-primary" role="status">
                                                    <span className="visually-hidden">Loading...</span>
                                                </div>
                                            </div>
                                        ) : (
                                            <>
                                                <table className="table bordered-table mb-0">
                                                <thead>
                                                    <tr>
                                                        <th scope="col">S.L</th>
                                                        <th scope="col">Block Name</th>
                                                        <th scope="col">Block Code</th>
                                                        <th scope="col">District</th>
                                                        <th scope="col">Created Date</th>
                                                        <th scope="col">Status</th>
                                                        {hasAnyAction && <th scope="col">Action</th>}
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {(() => {
                                                        const filteredBlocks = getFilteredBlocks();
                                                        const startIndex = (blockCurrentPage - 1) * blockItemsPerPage;
                                                        const endIndex = startIndex + blockItemsPerPage;
                                                        const paginatedBlocks = filteredBlocks.slice(startIndex, endIndex);
                                                        
                                                        if (paginatedBlocks.length === 0) {
                                                            return (
                                                                <tr>
                                                                    <td colSpan={hasAnyAction ? "7" : "6"} className="text-center py-4">
                                                                        {blockSearchTerm ? `No blocks found matching "${blockSearchTerm}"` : 'No blocks found'}
                                                                    </td>
                                                                </tr>
                                                            );
                                                        }
                                                        
                                                        return paginatedBlocks.map((block, index) => (
                                                            <tr key={block.id}>
                                                                <td>{startIndex + index + 1}</td>
                                                                <td title={block.name}>
                                                                    <div>{trimText(block.name, 20)}</div>
                                                                    {block.name_regional && (
                                                                        <small className="text-secondary-light">{trimText(block.name_regional, 20)}</small>
                                                                    )}
                                                                </td>
                                                                <td>{block.code}</td>
                                                                <td title={districts.find(d => d.id === block.district_id)?.name || 'N/A'}>{trimText(districts.find(d => d.id === block.district_id)?.name || 'N/A', 15)}</td>
                                                                <td>{formatDate(block.created_at)}</td>
                                                                <td>
                                                                    <span className={`px-24 py-4 rounded-pill fw-medium text-sm ${
                                                                        block.is_active 
                                                                            ? 'bg-success-focus text-success-main' 
                                                                            : 'bg-neutral-200 text-neutral-600'
                                                                    }`}>
                                                                        {block.is_active ? 'Active' : 'Inactive'}
                                                                    </span>
                                                                </td>
                                                                {hasAnyAction && (
                                                                    <td>
                                                                        {canEdit && (
                                                                            <button
                                                                                className="w-32-px h-32-px me-8 bg-success-focus text-success-main rounded-circle d-inline-flex align-items-center justify-content-center border-0"
                                                                                onClick={() => openEditModal(block)}
                                                                                title="Edit Block"
                                                                            >
                                                                                <Icon icon="lucide:edit" />
                                                                            </button>
                                                                        )}
                                                                        {canDelete && (
                                                                            <button
                                                                                className="w-32-px h-32-px me-8 bg-danger-focus text-danger-main rounded-circle d-inline-flex align-items-center justify-content-center border-0"
                                                                                onClick={() => { setSelectedBlock(block); setShowDeleteModal(true); }}
                                                                                title="Delete Block"
                                                                            >
                                                                                <Icon icon="mingcute:delete-2-line" />
                                                                            </button>
                                                                        )}
                                                                    </td>
                                                                )}
                                                            </tr>
                                                        ));
                                                    })()}
                                                </tbody>
                                            </table>
                                            {(() => {
                                                const filteredBlocks = getFilteredBlocks();
                                                const totalPages = Math.ceil(filteredBlocks.length / blockItemsPerPage);
                                                const startEntry = filteredBlocks.length === 0 ? 0 : ((blockCurrentPage - 1) * blockItemsPerPage) + 1;
                                                const endEntry = Math.min(blockCurrentPage * blockItemsPerPage, filteredBlocks.length);
                                                
                                                if (filteredBlocks.length > 0) {
                                                    return (
                                                        <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mt-24">
                                                            <span>Showing {startEntry} to {endEntry} of {filteredBlocks.length} entries{blockSearchTerm ? ` (filtered from ${blocks.length} total entries)` : ''}</span>
                                                            {totalPages > 1 && (
                                                                <ul className="pagination d-flex flex-wrap align-items-center gap-2 justify-content-center">
                                                                    {/* First Page */}
                                                                    <li className="page-item">
                                                                        <button
                                                                            className="page-link bg-neutral-200 text-secondary-light fw-semibold radius-8 border-0 d-flex align-items-center justify-content-center h-32-px w-32-px text-md"
                                                                            onClick={() => setBlockCurrentPage(1)}
                                                                            disabled={blockCurrentPage === 1}
                                                                            title="First Page"
                                                                        >
                                                                            <Icon icon="ep:d-arrow-left" /><Icon icon="ep:d-arrow-left" />
                                                                        </button>
                                                                    </li>
                                                                    {/* Previous Page */}
                                                                    <li className="page-item">
                                                                        <button
                                                                            className="page-link bg-neutral-200 text-secondary-light fw-semibold radius-8 border-0 d-flex align-items-center justify-content-center h-32-px w-32-px text-md"
                                                                            onClick={() => setBlockCurrentPage(prev => Math.max(prev - 1, 1))}
                                                                            disabled={blockCurrentPage === 1}
                                                                            title="Previous Page"
                                                                        >
                                                                            <Icon icon="ep:d-arrow-left" />
                                                                        </button>
                                                                    </li>
                                                                    {/* Page Numbers */}
                                                                    {getVisiblePages(blockCurrentPage, totalPages).map((page, index) => {
                                                                        if (page === '...') {
                                                                            return (
                                                                                <li key={`ellipsis-${index}`} className="page-item">
                                                                                    <span className="page-link bg-transparent border-0 d-flex align-items-center justify-content-center h-32-px w-32-px text-md text-secondary-light">
                                                                                        ...
                                                                                    </span>
                                                                                </li>
                                                                            );
                                                                        }
                                                                        return (
                                                                            <li key={page} className="page-item">
                                                                                <button
                                                                                    className={`page-link fw-semibold radius-8 border-0 d-flex align-items-center justify-content-center h-32-px w-32-px text-md ${
                                                                                        blockCurrentPage === page 
                                                                                            ? 'bg-primary-600 text-white' 
                                                                                            : 'bg-neutral-200 text-secondary-light'
                                                                                    }`}
                                                                                    onClick={() => setBlockCurrentPage(page)}
                                                                                >
                                                                                    {page}
                                                                                </button>
                                                                            </li>
                                                                        );
                                                                    })}
                                                                    {/* Next Page */}
                                                                    <li className="page-item">
                                                                        <button
                                                                            className="page-link bg-neutral-200 text-secondary-light fw-semibold radius-8 border-0 d-flex align-items-center justify-content-center h-32-px w-32-px text-md"
                                                                            onClick={() => setBlockCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                                                            disabled={blockCurrentPage === totalPages}
                                                                            title="Next Page"
                                                                        >
                                                                            <Icon icon="ep:d-arrow-right" />
                                                                        </button>
                                                                    </li>
                                                                    {/* Last Page */}
                                                                    <li className="page-item">
                                                                        <button
                                                                            className="page-link bg-neutral-200 text-secondary-light fw-semibold radius-8 border-0 d-flex align-items-center justify-content-center h-32-px w-32-px text-md"
                                                                            onClick={() => setBlockCurrentPage(totalPages)}
                                                                            disabled={blockCurrentPage === totalPages}
                                                                            title="Last Page"
                                                                        >
                                                                            <Icon icon="ep:d-arrow-right" /><Icon icon="ep:d-arrow-right" />
                                                                        </button>
                                                                    </li>
                                                                </ul>
                                                            )}
                                                        </div>
                                                    );
                                                }
                                                return null;
                                            })()}
                                            </>
                                        )}
                                    </>
                                )}
                                
                                {activeTab === 'wards' && (
                                    <>

                                        {loading ? (
                                            <div className="text-center py-4">
                                                <div className="spinner-border text-primary" role="status">
                                                    <span className="visually-hidden">Loading...</span>
                                                </div>
                                            </div>
                                        ) : (
                                            <>
                                                <table className="table bordered-table mb-0">
                                                    <thead>
                                                        <tr>
                                                            <th scope="col">S.L</th>
                                                            <th scope="col">Village/Ward Name</th>
                                                            <th scope="col">Village/Ward Code</th>
                                                            <th scope="col">Block</th>
                                                            <th scope="col">Created Date</th>
                                                            <th scope="col">Status</th>
                                                            {hasAnyAction && <th scope="col">Action</th>}
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {(() => {
                                                            const filteredWards = getFilteredWards();
                                                            const startIndex = (wardCurrentPage - 1) * wardItemsPerPage;
                                                            const endIndex = startIndex + wardItemsPerPage;
                                                            const paginatedWards = filteredWards.slice(startIndex, endIndex);
                                                            
                                                            if (paginatedWards.length === 0) {
                                                                return (
                                                                    <tr>
                                                                        <td colSpan={hasAnyAction ? "7" : "6"} className="text-center py-4">
                                                                            {wardSearchTerm ? `No wards found matching "${wardSearchTerm}"` : 'No wards found'}
                                                                        </td>
                                                                    </tr>
                                                                );
                                                            }
                                                            
                                                            return paginatedWards.map((ward, index) => (
                                                                <tr key={ward.id}>
                                                                    <td>{startIndex + index + 1}</td>
                                                                    <td title={ward.name}>{trimText(ward.name, 20)}{ward.name_regional && <><br /><small className="text-secondary-light">{trimText(ward.name_regional, 20)}</small></>}</td>
                                                                    <td>{ward.code}</td>
                                                                    <td title={blocks.find(b => b.id === ward.block_id)?.name || 'N/A'}>{trimText(blocks.find(b => b.id === ward.block_id)?.name || 'N/A', 15)}</td>
                                                                    <td>{formatDate(ward.created_at)}</td>
                                                                    <td>
                                                                        <span className={`px-24 py-4 rounded-pill fw-medium text-sm ${
                                                                            ward.is_active 
                                                                                ? 'bg-success-focus text-success-main' 
                                                                                : 'bg-neutral-200 text-neutral-600'
                                                                        }`}>
                                                                            {ward.is_active ? 'Active' : 'Inactive'}
                                                                        </span>
                                                                    </td>
                                                                    {hasAnyAction && (
                                                                        <td>
                                                                            {canEdit && (
                                                                                <button
                                                                                    className="w-32-px h-32-px me-8 bg-success-focus text-success-main rounded-circle d-inline-flex align-items-center justify-content-center border-0"
                                                                                    onClick={() => openEditWardModal(ward)}
                                                                                    title="Edit Ward"
                                                                                >
                                                                                    <Icon icon="lucide:edit" />
                                                                                </button>
                                                                            )}
                                                                            {canDelete && (
                                                                                <button
                                                                                    className="w-32-px h-32-px me-8 bg-danger-focus text-danger-main rounded-circle d-inline-flex align-items-center justify-content-center border-0"
                                                                                    onClick={() => { setSelectedWard(ward); setShowDeleteModal(true); }}
                                                                                    title="Delete Ward"
                                                                                >
                                                                                    <Icon icon="mingcute:delete-2-line" />
                                                                                </button>
                                                                            )}
                                                                        </td>
                                                                    )}
                                                                </tr>
                                                            ));
                                                        })()}
                                                    </tbody>
                                            </table>
                                            {(() => {
                                                const filteredWards = getFilteredWards();
                                                const totalPages = Math.ceil(filteredWards.length / wardItemsPerPage);
                                                const startEntry = filteredWards.length === 0 ? 0 : ((wardCurrentPage - 1) * wardItemsPerPage) + 1;
                                                const endEntry = Math.min(wardCurrentPage * wardItemsPerPage, filteredWards.length);
                                                
                                                if (filteredWards.length > 0) {
                                                    return (
                                                        <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mt-24">
                                                            <span>Showing {startEntry} to {endEntry} of {filteredWards.length} entries{wardSearchTerm ? ` (filtered from ${wards.length} total entries)` : ''}</span>
                                                            {totalPages > 1 && (
                                                                <ul className="pagination d-flex flex-wrap align-items-center gap-2 justify-content-center">
                                                                    {/* First Page */}
                                                                    <li className="page-item">
                                                                        <button
                                                                            className="page-link bg-neutral-200 text-secondary-light fw-semibold radius-8 border-0 d-flex align-items-center justify-content-center h-32-px w-32-px text-md"
                                                                            onClick={() => setWardCurrentPage(1)}
                                                                            disabled={wardCurrentPage === 1}
                                                                            title="First Page"
                                                                        >
                                                                            <Icon icon="ep:d-arrow-left" /><Icon icon="ep:d-arrow-left" />
                                                                        </button>
                                                                    </li>
                                                                    {/* Previous Page */}
                                                                    <li className="page-item">
                                                                        <button
                                                                            className="page-link bg-neutral-200 text-secondary-light fw-semibold radius-8 border-0 d-flex align-items-center justify-content-center h-32-px w-32-px text-md"
                                                                            onClick={() => setWardCurrentPage(prev => Math.max(prev - 1, 1))}
                                                                            disabled={wardCurrentPage === 1}
                                                                            title="Previous Page"
                                                                        >
                                                                            <Icon icon="ep:d-arrow-left" />
                                                                        </button>
                                                                    </li>
                                                                    {/* Page Numbers */}
                                                                    {getVisiblePages(wardCurrentPage, totalPages).map((page, index) => {
                                                                        if (page === '...') {
                                                                            return (
                                                                                <li key={`ellipsis-${index}`} className="page-item">
                                                                                    <span className="page-link bg-transparent border-0 d-flex align-items-center justify-content-center h-32-px w-32-px text-md text-secondary-light">
                                                                                        ...
                                                                                    </span>
                                                                                </li>
                                                                            );
                                                                        }
                                                                        return (
                                                                            <li key={page} className="page-item">
                                                                                <button
                                                                                    className={`page-link fw-semibold radius-8 border-0 d-flex align-items-center justify-content-center h-32-px w-32-px text-md ${
                                                                                        wardCurrentPage === page 
                                                                                            ? 'bg-primary-600 text-white' 
                                                                                            : 'bg-neutral-200 text-secondary-light'
                                                                                    }`}
                                                                                    onClick={() => setWardCurrentPage(page)}
                                                                                >
                                                                                    {page}
                                                                                </button>
                                                                            </li>
                                                                        );
                                                                    })}
                                                                    {/* Next Page */}
                                                                    <li className="page-item">
                                                                        <button
                                                                            className="page-link bg-neutral-200 text-secondary-light fw-semibold radius-8 border-0 d-flex align-items-center justify-content-center h-32-px w-32-px text-md"
                                                                            onClick={() => setWardCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                                                            disabled={wardCurrentPage === totalPages}
                                                                            title="Next Page"
                                                                        >
                                                                            <Icon icon="ep:d-arrow-right" />
                                                                        </button>
                                                                    </li>
                                                                    {/* Last Page */}
                                                                    <li className="page-item">
                                                                        <button
                                                                            className="page-link bg-neutral-200 text-secondary-light fw-semibold radius-8 border-0 d-flex align-items-center justify-content-center h-32-px w-32-px text-md"
                                                                            onClick={() => setWardCurrentPage(totalPages)}
                                                                            disabled={wardCurrentPage === totalPages}
                                                                            title="Last Page"
                                                                        >
                                                                            <Icon icon="ep:d-arrow-right" /><Icon icon="ep:d-arrow-right" />
                                                                        </button>
                                                                    </li>
                                                                </ul>
                                                            )}
                                                        </div>
                                                    );
                                                }
                                                return null;
                                            })()}
                                        </>
                                        )}
                                    </>
                                )}
                                
                                {activeTab === 'sub-centres' && (
                                    <>

                                        {loading ? (
                                            <div className="text-center py-4">
                                                <div className="spinner-border text-primary" role="status">
                                                    <span className="visually-hidden">Loading...</span>
                                                </div>
                                            </div>
                                        ) : (
                                            <>
                                                <table className="table bordered-table mb-0">
                                                    <thead>
                                                        <tr>
                                                            <th scope="col">S.L</th>
                                                            <th scope="col">Sub-Centre Name</th>
                                                            <th scope="col">Centre Code</th>
                                                            <th scope="col">Block</th>
                                                            <th scope="col">Address</th>
                                                            <th scope="col">Contact</th>
                                                            <th scope="col">Status</th>
                                                            {hasAnyAction && <th scope="col">Action</th>}
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {(() => {
                                                            const filteredSubCentres = getFilteredSubCentres();
                                                            const startIndex = (subCentreCurrentPage - 1) * subCentreItemsPerPage;
                                                            const endIndex = startIndex + subCentreItemsPerPage;
                                                            const paginatedSubCentres = filteredSubCentres.slice(startIndex, endIndex);
                                                            
                                                            if (paginatedSubCentres.length === 0) {
                                                                return (
                                                                    <tr>
                                                                        <td colSpan={hasAnyAction ? "8" : "7"} className="text-center py-4">
                                                                            {subCentreSearchTerm ? `No sub-centres found matching "${subCentreSearchTerm}"` : 'No sub-centres found'}
                                                                        </td>
                                                                    </tr>
                                                                );
                                                            }
                                                            
                                                            return paginatedSubCentres.map((subCentre, index) => (
                                                                <tr key={subCentre.id}>
                                                                    <td>{startIndex + index + 1}</td>
                                                                    <td title={subCentre.name}>{trimText(subCentre.name, 20)}</td>
                                                                    <td>{subCentre.code}</td>
                                                                    <td title={blocks.find(b => b.id === subCentre.block_id)?.name || 'N/A'}>{trimText(blocks.find(b => b.id === subCentre.block_id)?.name || 'N/A', 15)}</td>
                                                                    <td title={subCentre.address}>{trimText(subCentre.address, 15)}</td>
                                                                    <td>{subCentre.contact_number}</td>
                                                                    <td>
                                                                        <span className={`px-24 py-4 rounded-pill fw-medium text-sm ${
                                                                            subCentre.is_active 
                                                                                ? 'bg-success-focus text-success-main' 
                                                                                : 'bg-neutral-200 text-neutral-600'
                                                                        }`}>
                                                                            {subCentre.is_active ? 'Active' : 'Inactive'}
                                                                        </span>
                                                                    </td>
                                                                    {hasAnyAction && (
                                                                        <td>
                                                                            <button
                                                                                className="w-32-px h-32-px me-8 bg-primary-light text-primary-600 rounded-circle d-inline-flex align-items-center justify-content-center border-0"
                                                                                onClick={async () => {
                                                                                    setSelectedUSGCentre(null);
                                                                                    setSelectedSubCentre(subCentre);
                                                                                    setLoadingMappings(true);
                                                                                    setShowViewModal(true);
                                                                                    try {
                                                                                        const [blockMappings, wardMappings] = await Promise.all([
                                                                                            adminAPI.getSubCentreBlocks(subCentre.id),
                                                                                            adminAPI.getSubCentreWards(subCentre.id)
                                                                                        ]);
                                                                                        setViewMappings({ blocks: blockMappings || [], wards: wardMappings || [] });
                                                                                    } catch (error) {
                                                                                        console.warn('Failed to fetch mappings:', error);
                                                                                        setViewMappings({ blocks: [], wards: [] });
                                                                                    } finally {
                                                                                        setLoadingMappings(false);
                                                                                    }
                                                                                }}
                                                                                title="View Mappings"
                                                                            >
                                                                                <Icon icon="iconamoon:eye-light" />
                                                                            </button>
                                                                            {canEdit && (
                                                                                <button
                                                                                    className="w-32-px h-32-px me-8 bg-success-focus text-success-main rounded-circle d-inline-flex align-items-center justify-content-center border-0"
                                                                                    onClick={() => openEditSubCentreModal(subCentre)}
                                                                                    title="Edit Sub-Centre"
                                                                                >
                                                                                    <Icon icon="lucide:edit" />
                                                                                </button>
                                                                            )}
                                                                            {canDelete && (
                                                                                <button
                                                                                    className="w-32-px h-32-px me-8 bg-danger-focus text-danger-main rounded-circle d-inline-flex align-items-center justify-content-center border-0"
                                                                                    onClick={() => { setSelectedSubCentre(subCentre); setShowDeleteModal(true); }}
                                                                                    title="Delete Sub-Centre"
                                                                                >
                                                                                    <Icon icon="mingcute:delete-2-line" />
                                                                                </button>
                                                                            )}
                                                                        </td>
                                                                    )}
                                                                </tr>
                                                            ));
                                                        })()}
                                                    </tbody>
                                            </table>
                                            {(() => {
                                                const filteredSubCentres = getFilteredSubCentres();
                                                const totalPages = Math.ceil(filteredSubCentres.length / subCentreItemsPerPage);
                                                const startEntry = filteredSubCentres.length === 0 ? 0 : ((subCentreCurrentPage - 1) * subCentreItemsPerPage) + 1;
                                                const endEntry = Math.min(subCentreCurrentPage * subCentreItemsPerPage, filteredSubCentres.length);
                                                
                                                if (filteredSubCentres.length > 0) {
                                                    return (
                                                        <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mt-24">
                                                            <span>Showing {startEntry} to {endEntry} of {filteredSubCentres.length} entries{subCentreSearchTerm ? ` (filtered from ${subCentres.length} total entries)` : ''}</span>
                                                            {totalPages > 1 && (
                                                                <ul className="pagination d-flex flex-wrap align-items-center gap-2 justify-content-center">
                                                                    {/* First Page */}
                                                                    <li className="page-item">
                                                                        <button
                                                                            className="page-link bg-neutral-200 text-secondary-light fw-semibold radius-8 border-0 d-flex align-items-center justify-content-center h-32-px w-32-px text-md"
                                                                            onClick={() => setSubCentreCurrentPage(1)}
                                                                            disabled={subCentreCurrentPage === 1}
                                                                            title="First Page"
                                                                        >
                                                                            <Icon icon="ep:d-arrow-left" /><Icon icon="ep:d-arrow-left" />
                                                                        </button>
                                                                    </li>
                                                                    {/* Previous Page */}
                                                                    <li className="page-item">
                                                                        <button
                                                                            className="page-link bg-neutral-200 text-secondary-light fw-semibold radius-8 border-0 d-flex align-items-center justify-content-center h-32-px w-32-px text-md"
                                                                            onClick={() => setSubCentreCurrentPage(prev => Math.max(prev - 1, 1))}
                                                                            disabled={subCentreCurrentPage === 1}
                                                                            title="Previous Page"
                                                                        >
                                                                            <Icon icon="ep:d-arrow-left" />
                                                                        </button>
                                                                    </li>
                                                                    {/* Page Numbers */}
                                                                    {getVisiblePages(subCentreCurrentPage, totalPages).map((page, index) => {
                                                                        if (page === '...') {
                                                                            return (
                                                                                <li key={`ellipsis-${index}`} className="page-item">
                                                                                    <span className="page-link bg-transparent border-0 d-flex align-items-center justify-content-center h-32-px w-32-px text-md text-secondary-light">
                                                                                        ...
                                                                                    </span>
                                                                                </li>
                                                                            );
                                                                        }
                                                                        return (
                                                                            <li key={page} className="page-item">
                                                                                <button
                                                                                    className={`page-link fw-semibold radius-8 border-0 d-flex align-items-center justify-content-center h-32-px w-32-px text-md ${
                                                                                        subCentreCurrentPage === page 
                                                                                            ? 'bg-primary-600 text-white' 
                                                                                            : 'bg-neutral-200 text-secondary-light'
                                                                                    }`}
                                                                                    onClick={() => setSubCentreCurrentPage(page)}
                                                                                >
                                                                                    {page}
                                                                                </button>
                                                                            </li>
                                                                        );
                                                                    })}
                                                                    {/* Next Page */}
                                                                    <li className="page-item">
                                                                        <button
                                                                            className="page-link bg-neutral-200 text-secondary-light fw-semibold radius-8 border-0 d-flex align-items-center justify-content-center h-32-px w-32-px text-md"
                                                                            onClick={() => setSubCentreCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                                                            disabled={subCentreCurrentPage === totalPages}
                                                                            title="Next Page"
                                                                        >
                                                                            <Icon icon="ep:d-arrow-right" />
                                                                        </button>
                                                                    </li>
                                                                    {/* Last Page */}
                                                                    <li className="page-item">
                                                                        <button
                                                                            className="page-link bg-neutral-200 text-secondary-light fw-semibold radius-8 border-0 d-flex align-items-center justify-content-center h-32-px w-32-px text-md"
                                                                            onClick={() => setSubCentreCurrentPage(totalPages)}
                                                                            disabled={subCentreCurrentPage === totalPages}
                                                                            title="Last Page"
                                                                        >
                                                                            <Icon icon="ep:d-arrow-right" /><Icon icon="ep:d-arrow-right" />
                                                                        </button>
                                                                    </li>
                                                                </ul>
                                                            )}
                                                        </div>
                                                    );
                                                }
                                                return null;
                                            })()}
                                        </>
                                        )}
                                    </>
                                )}
                                
                                {activeTab === 'usg-centres' && (
                                    <>
                                        {loading ? (
                                            <div className="text-center py-4">
                                                <div className="spinner-border text-primary" role="status">
                                                    <span className="visually-hidden">Loading...</span>
                                                </div>
                                            </div>
                                        ) : (
                                            <>
                                                <div className="table-responsive">
                                                    <table className="table bordered-table mb-0">
                                                        <thead>
                                                            <tr>
                                                                <th scope="col">S.L</th>
                                                                <th scope="col">USG Centre Name</th>
                                                                <th scope="col">Centre Code</th>
                                                                <th scope="col">Covered Blocks</th>
                                                                <th scope="col">Type</th>
                                                                <th scope="col">Status</th>
                                                                {hasAnyAction && <th scope="col">Action</th>}
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {(() => {
                                                                const filteredUSGCentres = getFilteredUSGCentres();
                                                                const startIndex = (currentPage - 1) * usgCentreItemsPerPage;
                                                                const endIndex = startIndex + usgCentreItemsPerPage;
                                                                const paginatedUSGCentres = filteredUSGCentres.slice(startIndex, endIndex);
                                                                
                                                                if (paginatedUSGCentres.length === 0) {
                                                                    return (
                                                                        <tr>
                                                                            <td colSpan={hasAnyAction ? "7" : "6"} className="text-center py-4">
                                                                                {usgCentreSearchTerm ? `No USG centres found matching "${usgCentreSearchTerm}"` : 'No USG centres found'}
                                                                            </td>
                                                                        </tr>
                                                                    );
                                                                }
                                                                
                                                                return paginatedUSGCentres.map((usgCentre, index) => (
                                                                    <tr key={usgCentre.id}>
                                                                        <td>{startIndex + index + 1}</td>
                                                                        <td title={usgCentre.name}>{trimText(usgCentre.name, 25)}</td>
                                                                        <td title={usgCentre.code}>{trimText(usgCentre.code, 10)}</td>
                                                                        <td title={usgCentre.block_ids && usgCentre.block_ids.length > 0 ? usgCentre.block_ids.map(blockId => blocks.find(b => b.id === blockId)?.name).filter(Boolean).join(', ') : 'Not specified'}>
                                                                            {usgCentre.block_ids && usgCentre.block_ids.length > 0 ? trimText(usgCentre.block_ids.map(blockId => blocks.find(b => b.id === blockId)?.name).filter(Boolean).join(', '), 15) : 'Not specified'}
                                                                        </td>
                                                                        <td>
                                                                            <span className={`px-24 py-4 rounded-pill fw-medium text-sm ${
                                                                                usgCentre.is_private 
                                                                                    ? 'bg-warning-focus text-warning-main' 
                                                                                    : 'bg-info-focus text-info-main'
                                                                            }`}>
                                                                                {usgCentre.is_private ? 'Private' : 'Government'}
                                                                            </span>
                                                                        </td>
                                                                        <td>
                                                                            <span className={`px-24 py-4 rounded-pill fw-medium text-sm ${
                                                                                usgCentre.is_active 
                                                                                    ? 'bg-success-focus text-success-main' 
                                                                                    : 'bg-neutral-200 text-neutral-600'
                                                                            }`}>
                                                                                {usgCentre.is_active ? 'Active' : 'Inactive'}
                                                                            </span>
                                                                        </td>
                                                                        {hasAnyAction && (
                                                                            <td>
                                                                                <button
                                                                                    className="w-32-px h-32-px me-8 bg-primary-light text-primary-600 rounded-circle d-inline-flex align-items-center justify-content-center border-0"
                                                                                    onClick={() => { setSelectedSubCentre(null); setSelectedUSGCentre(usgCentre); setShowViewModal(true); }}
                                                                                    title="View USG Centre"
                                                                                >
                                                                                    <Icon icon="iconamoon:eye-light" />
                                                                                </button>
                                                                                {canEdit && (
                                                                                    <button
                                                                                        className="w-32-px h-32-px me-8 bg-success-focus text-success-main rounded-circle d-inline-flex align-items-center justify-content-center border-0"
                                                                                        onClick={() => openEditUSGCentreModal(usgCentre)}
                                                                                        title="Edit USG Centre"
                                                                                    >
                                                                                        <Icon icon="lucide:edit" />
                                                                                    </button>
                                                                                )}
                                                                                {canDelete && (
                                                                                    <button
                                                                                        className="w-32-px h-32-px me-8 bg-danger-focus text-danger-main rounded-circle d-inline-flex align-items-center justify-content-center border-0"
                                                                                        onClick={() => { setSelectedUSGCentre(usgCentre); setShowDeleteModal(true); }}
                                                                                        title="Delete USG Centre"
                                                                                    >
                                                                                        <Icon icon="mingcute:delete-2-line" />
                                                                                    </button>
                                                                                )}
                                                                            </td>
                                                                        )}
                                                                    </tr>
                                                                ));
                                                            })()}
                                                        </tbody>
                                                    </table>
                                                </div>
                                                {(() => {
                                                    const filteredUSGCentres = getFilteredUSGCentres();
                                                    const totalPages = Math.ceil(filteredUSGCentres.length / usgCentreItemsPerPage);
                                                    const startEntry = filteredUSGCentres.length === 0 ? 0 : ((currentPage - 1) * usgCentreItemsPerPage) + 1;
                                                    const endEntry = Math.min(currentPage * usgCentreItemsPerPage, filteredUSGCentres.length);
                                                    
                                                    if (filteredUSGCentres.length > 0) {
                                                        return (
                                                            <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mt-24">
                                                                <span>Showing {startEntry} to {endEntry} of {filteredUSGCentres.length} entries{usgCentreSearchTerm ? ` (filtered from ${usgCentres.length} total entries)` : ''}</span>
                                                                {totalPages > 1 && (
                                                                    <ul className="pagination d-flex flex-wrap align-items-center gap-2 justify-content-center">
                                                                        {/* First Page */}
                                                                        <li className="page-item">
                                                                            <button
                                                                                className="page-link bg-neutral-200 text-secondary-light fw-semibold radius-8 border-0 d-flex align-items-center justify-content-center h-32-px w-32-px text-md"
                                                                                onClick={() => setCurrentPage(1)}
                                                                                disabled={currentPage === 1}
                                                                                title="First Page"
                                                                            >
                                                                                <Icon icon="ep:d-arrow-left" /><Icon icon="ep:d-arrow-left" />
                                                                            </button>
                                                                        </li>
                                                                        {/* Previous Page */}
                                                                        <li className="page-item">
                                                                            <button
                                                                                className="page-link bg-neutral-200 text-secondary-light fw-semibold radius-8 border-0 d-flex align-items-center justify-content-center h-32-px w-32-px text-md"
                                                                                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                                                                disabled={currentPage === 1}
                                                                                title="Previous Page"
                                                                            >
                                                                                <Icon icon="ep:d-arrow-left" />
                                                                            </button>
                                                                        </li>
                                                                        {/* Page Numbers */}
                                                                        {getVisiblePages(currentPage, totalPages).map((page, index) => {
                                                                            if (page === '...') {
                                                                                return (
                                                                                    <li key={`ellipsis-${index}`} className="page-item">
                                                                                        <span className="page-link bg-transparent border-0 d-flex align-items-center justify-content-center h-32-px w-32-px text-md text-secondary-light">
                                                                                            ...
                                                                                        </span>
                                                                                    </li>
                                                                                );
                                                                            }
                                                                            return (
                                                                                <li key={page} className="page-item">
                                                                                    <button
                                                                                        className={`page-link fw-semibold radius-8 border-0 d-flex align-items-center justify-content-center h-32-px w-32-px text-md ${
                                                                                            currentPage === page 
                                                                                                ? 'bg-primary-600 text-white' 
                                                                                                : 'bg-neutral-200 text-secondary-light'
                                                                                        }`}
                                                                                        onClick={() => setCurrentPage(page)}
                                                                                    >
                                                                                        {page}
                                                                                    </button>
                                                                                </li>
                                                                            );
                                                                        })}
                                                                        {/* Next Page */}
                                                                        <li className="page-item">
                                                                            <button
                                                                                className="page-link bg-neutral-200 text-secondary-light fw-semibold radius-8 border-0 d-flex align-items-center justify-content-center h-32-px w-32-px text-md"
                                                                                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                                                                disabled={currentPage === totalPages}
                                                                                title="Next Page"
                                                                            >
                                                                                <Icon icon="ep:d-arrow-right" />
                                                                            </button>
                                                                        </li>
                                                                        {/* Last Page */}
                                                                        <li className="page-item">
                                                                            <button
                                                                                className="page-link bg-neutral-200 text-secondary-light fw-semibold radius-8 border-0 d-flex align-items-center justify-content-center h-32-px w-32-px text-md"
                                                                                onClick={() => setCurrentPage(totalPages)}
                                                                                disabled={currentPage === totalPages}
                                                                                title="Last Page"
                                                                            >
                                                                                <Icon icon="ep:d-arrow-right" /><Icon icon="ep:d-arrow-right" />
                                                                            </button>
                                                                        </li>
                                                                    </ul>
                                                                )}
                                                            </div>
                                                        );
                                                    }
                                                    return null;
                                                })()}
                                            </>
                                        )}
                                    </>
                                )}
                                
                                {activeTab === 'delivery-points' && (
                                    <>
                                        {loading ? (
                                            <div className="text-center py-4">
                                                <div className="spinner-border text-primary" role="status">
                                                    <span className="visually-hidden">Loading...</span>
                                                </div>
                                            </div>
                                        ) : (() => {
                                            const filtered = deliveryPoints.filter(dp =>
                                                !dpSearchTerm ||
                                                dp.name?.toLowerCase().includes(dpSearchTerm.toLowerCase()) ||
                                                dp.code?.toLowerCase().includes(dpSearchTerm.toLowerCase()) ||
                                                dp.contact_number?.includes(dpSearchTerm)
                                            );
                                            const totalPages = Math.ceil(filtered.length / dpItemsPerPage);
                                            const startIndex = (dpCurrentPage - 1) * dpItemsPerPage;
                                            const paginated = filtered.slice(startIndex, startIndex + dpItemsPerPage);
                                            return (
                                                <>
                                                    <div className="table-responsive">
                                                    <table className="table bordered-table mb-0">
                                                        <thead>
                                                            <tr>
                                                                <th>S.L</th>
                                                                <th>Name</th>
                                                                <th>Code</th>
                                                                <th>Block</th>
                                                                <th>Contact Person</th>
                                                                <th>Contact</th>
                                                                <th>Status</th>
                                                                {hasAnyAction && <th>Action</th>}
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {paginated.length === 0 ? (
                                                                <tr><td colSpan={hasAnyAction ? 8 : 7} className="text-center py-4">No delivery points found</td></tr>
                                                            ) : paginated.map((dp, index) => (
                                                                <tr key={dp.id}>
                                                                    <td>{startIndex + index + 1}</td>
                                                                    <td title={dp.name}>{trimText(dp.name, 15)}</td>
                                                                    <td title={dp.code}>{trimText(dp.code, 15)}</td>
                                                                    <td title={blocks.find(b => b.id === dp.block_id)?.name || 'N/A'}>{trimText(blocks.find(b => b.id === dp.block_id)?.name || 'N/A', 15)}</td>
                                                                    <td title={dp.contact_person_name || 'N/A'}>{trimText(dp.contact_person_name || 'N/A', 15)}</td>
                                                                    <td>{dp.contact_number || 'N/A'}</td>
                                                                    <td>
                                                                        <span className={`px-24 py-4 rounded-pill fw-medium text-sm ${dp.is_active ? 'bg-success-focus text-success-main' : 'bg-neutral-200 text-neutral-600'}`}>
                                                                            {dp.is_active ? 'Active' : 'Inactive'}
                                                                        </span>
                                                                    </td>
                                                                    {hasAnyAction && (
                                                                        <td>
                                                                            {canEdit && (
                                                                                <button
                                                                                    className="w-32-px h-32-px me-8 bg-success-focus text-success-main rounded-circle d-inline-flex align-items-center justify-content-center border-0"
                                                                                    onClick={() => {
                                                                                        setSelectedDeliveryPoint(dp);
                                                                                        setFormData({ name: dp.name, code: dp.code, district_id: dp.district_id, block_id: dp.block_id || '', address: dp.address || '', contact_number: dp.contact_number || '', contact_person_name: dp.contact_person_name || '', email: '', google_map_url: '', is_empanelled: true, is_private: false, block_ids: [], ward_ids: [] });
                                                                                        setShowEditModal(true);
                                                                                    }}
                                                                                    title="Edit"
                                                                                >
                                                                                    <Icon icon="lucide:edit" />
                                                                                </button>
                                                                            )}
                                                                            {canDelete && (
                                                                                <button
                                                                                    className="w-32-px h-32-px me-8 bg-danger-focus text-danger-main rounded-circle d-inline-flex align-items-center justify-content-center border-0"
                                                                                    onClick={() => { setSelectedDeliveryPoint(dp); setShowDeleteModal(true); }}
                                                                                    title="Delete"
                                                                                >
                                                                                    <Icon icon="mingcute:delete-2-line" />
                                                                                </button>
                                                                            )}
                                                                        </td>
                                                                    )}
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                    </div>
                                                    {filtered.length > 0 && (
                                                        <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mt-24">
                                                            <span>Showing {filtered.length === 0 ? 0 : startIndex + 1} to {Math.min(startIndex + dpItemsPerPage, filtered.length)} of {filtered.length} entries</span>
                                                            {totalPages > 1 && (
                                                                <ul className="pagination d-flex flex-wrap align-items-center gap-2 justify-content-center">
                                                                    <li className="page-item"><button className="page-link bg-neutral-200 text-secondary-light fw-semibold radius-8 border-0 d-flex align-items-center justify-content-center h-32-px w-32-px" onClick={() => setDPCurrentPage(1)} disabled={dpCurrentPage === 1}><Icon icon="ep:d-arrow-left" /><Icon icon="ep:d-arrow-left" /></button></li>
                                                                    <li className="page-item"><button className="page-link bg-neutral-200 text-secondary-light fw-semibold radius-8 border-0 d-flex align-items-center justify-content-center h-32-px w-32-px" onClick={() => setDPCurrentPage(p => Math.max(p - 1, 1))} disabled={dpCurrentPage === 1}><Icon icon="ep:d-arrow-left" /></button></li>
                                                                    {getVisiblePages(dpCurrentPage, totalPages).map((page, i) => page === '...' ? (
                                                                        <li key={`e${i}`} className="page-item"><span className="page-link bg-transparent border-0 d-flex align-items-center justify-content-center h-32-px w-32-px text-secondary-light">...</span></li>
                                                                    ) : (
                                                                        <li key={page} className="page-item"><button className={`page-link fw-semibold radius-8 border-0 d-flex align-items-center justify-content-center h-32-px w-32-px ${dpCurrentPage === page ? 'bg-primary-600 text-white' : 'bg-neutral-200 text-secondary-light'}`} onClick={() => setDPCurrentPage(page)}>{page}</button></li>
                                                                    ))}
                                                                    <li className="page-item"><button className="page-link bg-neutral-200 text-secondary-light fw-semibold radius-8 border-0 d-flex align-items-center justify-content-center h-32-px w-32-px" onClick={() => setDPCurrentPage(p => Math.min(p + 1, totalPages))} disabled={dpCurrentPage === totalPages}><Icon icon="ep:d-arrow-right" /></button></li>
                                                                    <li className="page-item"><button className="page-link bg-neutral-200 text-secondary-light fw-semibold radius-8 border-0 d-flex align-items-center justify-content-center h-32-px w-32-px" onClick={() => setDPCurrentPage(totalPages)} disabled={dpCurrentPage === totalPages}><Icon icon="ep:d-arrow-right" /><Icon icon="ep:d-arrow-right" /></button></li>
                                                                </ul>
                                                            )}
                                                        </div>
                                                    )}
                                                </>
                                            );
                                        })()}
                                    </>
                                )}

                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {showViewModal && selectedSubCentre && !selectedUSGCentre && (
                <>
                    <div className="modal fade show" style={{display: 'block'}} tabIndex="-1">
                        <div className="modal-dialog modal-dialog-centered modal-lg">
                            <div className="modal-content">
                                <div className="modal-header">
                                    <h5 className="modal-title">Sub-Centre Mappings - {selectedSubCentre.name}</h5>
                                    <button type="button" className="btn-close" onClick={() => setShowViewModal(false)}></button>
                                </div>
                                <div className="modal-body">
                                    <div className="row g-3">
                                        <div className="col-md-6">
                                            <div className="p-16 radius-8 bg-neutral-50">
                                                <span className="text-secondary-light fw-medium">Sub-Centre Name:</span>
                                                <span className="ms-12 fw-semibold text-neutral-600">{selectedSubCentre.name}</span>
                                            </div>
                                        </div>
                                        <div className="col-md-6">
                                            <div className="p-16 radius-8 bg-neutral-50">
                                                <span className="text-secondary-light fw-medium">Code:</span>
                                                <span className="ms-12 fw-semibold text-neutral-600">{selectedSubCentre.code}</span>
                                            </div>
                                        </div>
                                        <div className="col-md-6">
                                            <div className="p-16 radius-8 bg-neutral-50">
                                                <span className="text-secondary-light fw-medium">Primary Block:</span>
                                                <span className="ms-12 fw-semibold text-neutral-600">{blocks.find(b => b.id === selectedSubCentre.block_id)?.name || 'N/A'}</span>
                                            </div>
                                        </div>
                                        <div className="col-md-6">
                                            <div className="p-16 radius-8 bg-neutral-50">
                                                <span className="text-secondary-light fw-medium">Contact:</span>
                                                <span className="ms-12 fw-semibold text-neutral-600">{selectedSubCentre.contact_number}</span>
                                            </div>
                                        </div>
                                        <div className="col-12">
                                            <div className="p-16 radius-8 bg-neutral-50">
                                                <span className="text-secondary-light fw-medium">Address:</span>
                                                <span className="ms-12 fw-semibold text-neutral-600">{selectedSubCentre.address}</span>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="mt-4">
                                        <h6 className="mb-3">Coverage Information</h6>
                                        {loadingMappings ? (
                                            <div className="text-center py-3">
                                                <div className="spinner-border spinner-border-sm text-primary" role="status">
                                                    <span className="visually-hidden">Loading mappings...</span>
                                                </div>
                                                <small className="d-block mt-2 text-muted">Loading coverage data...</small>
                                            </div>
                                        ) : (
                                            <div className="row g-3">
                                                <div className="col-md-6">
                                                    <div className="card border-0 bg-light">
                                                        <div className="card-body p-3">
                                                            <h6 className="card-title mb-2 text-primary">Covered Blocks ({viewMappings.blocks.length})</h6>
                                                            {viewMappings.blocks.length === 0 ? (
                                                                <small className="text-muted">No blocks mapped</small>
                                                            ) : (
                                                                <div className="d-flex flex-wrap gap-1">
                                                                    {viewMappings.blocks.map(mapping => {
                                                                        const block = blocks.find(b => b.id === mapping.block_id);
                                                                        return block ? (
                                                                            <span key={mapping.block_id} className="badge bg-primary-subtle text-primary-emphasis">
                                                                                {block.name}
                                                                            </span>
                                                                        ) : null;
                                                                    })}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="col-md-6">
                                                    <div className="card border-0 bg-light">
                                                        <div className="card-body p-3">
                                                            <h6 className="card-title mb-2 text-success">Covered Wards ({viewMappings.wards.length})</h6>
                                                            {viewMappings.wards.length === 0 ? (
                                                                <small className="text-muted">No wards mapped</small>
                                                            ) : (
                                                                <div className="d-flex flex-wrap gap-1">
                                                                    {viewMappings.wards.map(mapping => {
                                                                        const ward = wards.find(w => w.id === mapping.ward_id);
                                                                        return ward ? (
                                                                            <span key={mapping.ward_id} className="badge bg-success-subtle text-success-emphasis">
                                                                                {ward.name}
                                                                            </span>
                                                                        ) : null;
                                                                    })}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="modal-footer justify-content-center">
                                    <button type="button" className="btn btn-secondary" onClick={() => setShowViewModal(false)}>Close</button>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="modal-backdrop fade show" onClick={() => setShowViewModal(false)}></div>
                </>
            )}

            {/* Add Modal */}
            {showAddModal && (
                <>
                    <div className="modal fade show" style={{display: 'block'}} tabIndex="-1">
                        <div className="modal-dialog modal-dialog-centered">
                            <div className="modal-content">
                                <form onSubmit={activeTab === 'blocks' ? handleAddBlock : activeTab === 'wards' ? handleAddWard : activeTab === 'sub-centres' ? handleAddSubCentre : activeTab === 'delivery-points' ? handleAddDeliveryPoint : handleAddUSGCentre}>
                                    <div className="modal-header">
                                        <h5 className="modal-title">Add New {activeTab === 'blocks' ? 'Block' : activeTab === 'wards' ? 'Village/Ward' : activeTab === 'sub-centres' ? 'Sub-Centre' : activeTab === 'delivery-points' ? 'Delivery Point' : 'USG Centre'}</h5>
                                        <button type="button" className="btn-close" onClick={() => setShowAddModal(false)}></button>
                                    </div>
                                    <div className="modal-body">
                                        <div className="row g-3">
                                            <div className="col-12">
                                                <label className="form-label">{activeTab === 'blocks' ? 'Block' : activeTab === 'wards' ? 'Village/Ward' : activeTab === 'sub-centres' ? 'Sub-Centre' : activeTab === 'delivery-points' ? 'Delivery Point' : 'USG Centre'} Name</label>
                                                <input type="text" className="form-control" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} required />
                                            </div>
                                            {(activeTab === 'blocks' || activeTab === 'wards') && (
                                                <div className="col-12">
                                                    <label className="form-label">{activeTab === 'blocks' ? 'Block' : 'Village/Ward'} Name (Regional / ଓଡ଼ିଆ)</label>
                                                    <input type="text" className="form-control" value={formData.name_regional} onChange={(e) => setFormData({...formData, name_regional: e.target.value})} placeholder="e.g. ଭୁବନେଶ୍ୱର" />
                                                </div>
                                            )}
                                            <div className="col-12">
                                                <label className="form-label">{activeTab === 'blocks' ? 'Block' : activeTab === 'wards' ? 'Village/Ward' : activeTab === 'delivery-points' ? 'Delivery Point' : 'Centre'} Code</label>
                                                <input type="text" className="form-control" value={formData.code} onChange={(e) => setFormData({...formData, code: e.target.value})} required />
                                            </div>
                                            {(activeTab === 'blocks' || activeTab === 'usg-centres' || activeTab === 'delivery-points') && (
                                                <div className="col-12">
                                                    <label className="form-label">District</label>
                                                    <div className="position-relative">
                                                        <div className="input-group">
                                                            <input 
                                                                type="text"
                                                                className="form-control"
                                                                placeholder="Search or select district..."
                                                                value={districtSearch}
                                                                onChange={(e) => {
                                                                    setDistrictSearch(e.target.value);
                                                                    setShowDistrictDropdown(true);
                                                                }}
                                                                onFocus={() => setShowDistrictDropdown(true)}
                                                                autoComplete="off"
                                                            />
                                                            <button 
                                                                type="button"
                                                                className="btn btn-outline-secondary"
                                                                onClick={() => setShowDistrictDropdown(!showDistrictDropdown)}
                                                            >
                                                                <Icon icon={showDistrictDropdown ? "solar:alt-arrow-up-bold" : "solar:alt-arrow-down-bold"} />
                                                            </button>
                                                        </div>
                                                        {showDistrictDropdown && (
                                                            <div className="card position-absolute w-100 mt-1 shadow border-0" style={{zIndex: 1050, maxHeight: '200px'}}>
                                                                <div className="list-group list-group-flush" style={{maxHeight: '200px', overflowY: 'auto'}}>
                                                                    {districts
                                                                        .filter(district => 
                                                                            !districtSearch || district.name?.toLowerCase().includes(districtSearch.toLowerCase())
                                                                        )
                                                                        .map(district => (
                                                                            <button 
                                                                                key={district.id}
                                                                                type="button"
                                                                                className="list-group-item list-group-item-action border-0 py-2 px-3 text-start"
                                                                                onClick={() => {
                                                                                    setFormData({...formData, district_id: district.id});
                                                                                    setDistrictSearch(district.name);
                                                                                    setShowDistrictDropdown(false);
                                                                                }}
                                                                            >
                                                                                {district.name}
                                                                            </button>
                                                                        ))
                                                                    }
                                                                    {districts.filter(district => 
                                                                        !districtSearch || district.name?.toLowerCase().includes(districtSearch.toLowerCase())
                                                                    ).length === 0 && (
                                                                        <div className="list-group-item border-0 py-3 text-center text-muted">
                                                                            <small>No districts found</small>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                            {(activeTab === 'wards' || activeTab === 'sub-centres' || activeTab === 'delivery-points') && (
                                                <div className="col-12">
                                                    <label className="form-label">Block</label>
                                                    <div className="position-relative">
                                                        <div className="input-group">
                                                            <input 
                                                                type="text"
                                                                className="form-control"
                                                                placeholder="Search or select block..."
                                                                value={blockSearch}
                                                                onChange={(e) => {
                                                                    setBlockSearch(e.target.value);
                                                                    setShowBlockDropdown(true);
                                                                }}
                                                                onFocus={() => setShowBlockDropdown(true)}
                                                                autoComplete="off"
                                                            />
                                                            <button 
                                                                type="button"
                                                                className="btn btn-outline-secondary"
                                                                onClick={() => setShowBlockDropdown(!showBlockDropdown)}
                                                            >
                                                                <Icon icon={showBlockDropdown ? "solar:alt-arrow-up-bold" : "solar:alt-arrow-down-bold"} />
                                                            </button>
                                                        </div>
                                                        {showBlockDropdown && (
                                                            <div className="card position-absolute w-100 mt-1 shadow border-0" style={{zIndex: 1050, maxHeight: '200px'}}>
                                                                <div className="list-group list-group-flush" style={{maxHeight: '200px', overflowY: 'auto'}}>
                                                                    {blocks
                                                                        .filter(block => 
                                                                            !blockSearch || block.name?.toLowerCase().includes(blockSearch.toLowerCase())
                                                                        )
                                                                        .map(block => (
                                                                            <button 
                                                                                key={block.id}
                                                                                type="button"
                                                                                className="list-group-item list-group-item-action border-0 py-2 px-3 text-start"
                                                                                onClick={() => {
                                                                                    setFormData({...formData, block_id: block.id});
                                                                                    setBlockSearch(block.name);
                                                                                    setShowBlockDropdown(false);
                                                                                }}
                                                                            >
                                                                                {block.name}
                                                                            </button>
                                                                        ))
                                                                    }
                                                                    {blocks.filter(block => 
                                                                        !blockSearch || block.name?.toLowerCase().includes(blockSearch.toLowerCase())
                                                                    ).length === 0 && (
                                                                        <div className="list-group-item border-0 py-3 text-center text-muted">
                                                                            <small>No blocks found</small>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                            {activeTab === 'delivery-points' && (
                                                <>
                                                    <div className="col-12">
                                                        <label className="form-label">Address</label>
                                                        <textarea className="form-control" rows="3" value={formData.address} onChange={(e) => setFormData({...formData, address: e.target.value})}></textarea>
                                                    </div>
                                                    <div className="col-12">
                                                        <label className="form-label">Contact Number</label>
                                                        <input type="text" className="form-control" value={formData.contact_number} onChange={(e) => setFormData({...formData, contact_number: e.target.value})} maxLength="10" placeholder="10-digit mobile number" />
                                                    </div>
                                                    <div className="col-12">
                                                        <label className="form-label">Contact Person Name</label>
                                                        <input type="text" className="form-control" value={formData.contact_person_name} onChange={(e) => setFormData({...formData, contact_person_name: e.target.value})} placeholder="Optional" />
                                                    </div>
                                                </>
                                            )}
                                            {activeTab === 'usg-centres' && (
                                                <div className="col-12">
                                                    <label className="form-label">Covered Blocks (Optional)</label>
                                                    <div className="border rounded p-3" style={{maxHeight: '200px', overflowY: 'auto'}}>
                                                        {blocks.length === 0 ? (
                                                            <small className="text-muted">No blocks available</small>
                                                        ) : (
                                                            blocks.filter(b => b.district_id === Number(formData.district_id)).map(block => (
                                                                <div key={block.id} className="form-check d-flex align-items-center gap-2 mb-2">
                                                                    <input 
                                                                        className="form-check-input" 
                                                                        type="checkbox" 
                                                                        value={block.id}
                                                                        checked={selectedBlockIds.includes(block.id)}
                                                                        onChange={(e) => {
                                                                            if (e.target.checked) {
                                                                                setSelectedBlockIds([...selectedBlockIds, block.id]);
                                                                            } else {
                                                                                setSelectedBlockIds(selectedBlockIds.filter(id => id !== block.id));
                                                                            }
                                                                        }}
                                                                    />
                                                                    <label className="form-check-label line-height-1 fw-medium text-secondary-light">
                                                                        {block.name} ({block.code})
                                                                    </label>
                                                                </div>
                                                            ))
                                                        )}
                                                    </div>
                                                    <small className="text-muted">Select blocks that this USG centre serves</small>
                                                </div>
                                            )}
                                            {/* Ward Selection - Commented Out
                                            {activeTab === 'usg-centres' && (
                                                <div className="col-12">
                                                    <label className="form-label">Ward</label>
                                                    <div className="position-relative">
                                                        <div className="input-group">
                                                            <input 
                                                                type="text"
                                                                className="form-control"
                                                                placeholder="Search or select ward..."
                                                                value={wardSearch}
                                                                onChange={(e) => {
                                                                    setWardSearch(e.target.value);
                                                                    setShowWardDropdown(true);
                                                                }}
                                                                onFocus={() => setShowWardDropdown(true)}
                                                                autoComplete="off"
                                                            />
                                                            <button 
                                                                type="button"
                                                                className="btn btn-outline-secondary"
                                                                onClick={() => setShowWardDropdown(!showWardDropdown)}
                                                            >
                                                                <Icon icon={showWardDropdown ? "solar:alt-arrow-up-bold" : "solar:alt-arrow-down-bold"} />
                                                            </button>
                                                        </div>
                                                        {showWardDropdown && (
                                                            <div className="card position-absolute w-100 mt-1 shadow border-0" style={{zIndex: 1050, maxHeight: '200px'}}>
                                                                <div className="list-group list-group-flush" style={{maxHeight: '200px', overflowY: 'auto'}}>
                                                                    {wards
                                                                        .filter(ward => 
                                                                            (!wardSearch || ward.name?.toLowerCase().includes(wardSearch.toLowerCase())) &&
                                                                            (!formData.block_id || ward.block_id === Number(formData.block_id))
                                                                        )
                                                                        .map(ward => (
                                                                            <button 
                                                                                key={ward.id}
                                                                                type="button"
                                                                                className="list-group-item list-group-item-action border-0 py-2 px-3 text-start"
                                                                                onClick={() => {
                                                                                    setFormData({...formData, ward_id: ward.id});
                                                                                    setWardSearch(ward.name);
                                                                                    setShowWardDropdown(false);
                                                                                }}
                                                                            >
                                                                                {ward.name}
                                                                            </button>
                                                                        ))
                                                                    }
                                                                    {wards.filter(ward => 
                                                                        (!wardSearch || ward.name?.toLowerCase().includes(wardSearch.toLowerCase())) &&
                                                                        (!formData.block_id || ward.block_id === Number(formData.block_id))
                                                                    ).length === 0 && (
                                                                        <div className="list-group-item border-0 py-3 text-center text-muted">
                                                                            <small>No wards found</small>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                            */}
                                            {(activeTab === 'sub-centres') && (
                                                <>
                                                    <div className="col-12">
                                                        <label className="form-label">Address</label>
                                                        <textarea className="form-control" rows="3" value={formData.address} onChange={(e) => setFormData({...formData, address: e.target.value})} required></textarea>
                                                    </div>
                                                    <div className="col-12">
                                                        <label className="form-label">Contact Number</label>
                                                        <input 
                                                            type="text" 
                                                            className={`form-control ${mobileError ? 'is-invalid' : ''}`}
                                                            value={formData.contact_number} 
                                                            onChange={(e) => {
                                                                const formatted = formatMobileNumberInput(e.target.value);
                                                                setFormData({...formData, contact_number: formatted});
                                                                if (formatted) {
                                                                    const validation = validateMobileNumber(formatted);
                                                                    setMobileError(validation.isValid ? '' : validation.error);
                                                                } else {
                                                                    setMobileError('');
                                                                }
                                                            }}
                                                            onBlur={() => {
                                                                if (formData.contact_number) {
                                                                    const validation = validateMobileNumber(formData.contact_number);
                                                                    setMobileError(validation.isValid ? '' : validation.error);
                                                                }
                                                            }}
                                                            maxLength="10"
                                                            placeholder="Enter 10-digit mobile number"
                                                            required 
                                                        />
                                                        {mobileError && <div className="text-danger-600 text-sm mt-1">{mobileError}</div>}
                                                    </div>
                                                    
                                                    {/* Block Mapping Section - HIDDEN (Auto-mapped) */}
                                                    {/* <div className="col-12">
                                                        <label className="form-label">Covered Blocks (Optional)</label>
                                                        <div className="border rounded p-3" style={{maxHeight: '200px', overflowY: 'auto'}}>
                                                            {blocks.length === 0 ? (
                                                                <small className="text-muted">No blocks available</small>
                                                            ) : (
                                                                blocks.map(block => (
                                                                    <div key={block.id} className="form-check d-flex align-items-center gap-2 mb-2">
                                                                        <input 
                                                                            className="form-check-input" 
                                                                            type="checkbox" 
                                                                            value={block.id}
                                                                            checked={selectedBlockIds.includes(block.id)}
                                                                            onChange={(e) => {
                                                                                if (e.target.checked) {
                                                                                    setSelectedBlockIds([...selectedBlockIds, block.id]);
                                                                                } else {
                                                                                    setSelectedBlockIds(selectedBlockIds.filter(id => id !== block.id));
                                                                                }
                                                                            }}
                                                                        />
                                                                        <label className="form-check-label line-height-1 fw-medium text-secondary-light">
                                                                            {block.name} ({block.code})
                                                                        </label>
                                                                    </div>
                                                                ))
                                                            )}
                                                        </div>
                                                        <small className="text-muted">Select blocks that this sub-centre covers</small>
                                                    </div> */}
                                                    
                                                    {/* Ward Mapping Section - HIDDEN (Auto-mapped) */}
                                                    {/* <div className="col-12">
                                                        <label className="form-label">Covered Wards (Optional)</label>
                                                        <div className="border rounded p-3" style={{maxHeight: '200px', overflowY: 'auto'}}>
                                                            {selectedBlockIds.length === 0 ? (
                                                                <small className="text-muted">Select blocks first to see available wards</small>
                                                            ) : (
                                                                wards.filter(ward => selectedBlockIds.includes(ward.block_id)).length === 0 ? (
                                                                    <small className="text-muted">No wards found for selected blocks</small>
                                                                ) : (
                                                                    wards.filter(ward => selectedBlockIds.includes(ward.block_id)).map(ward => (
                                                                        <div key={ward.id} className="form-check d-flex align-items-center gap-2 mb-2">
                                                                            <input 
                                                                                className="form-check-input" 
                                                                                type="checkbox" 
                                                                                value={ward.id}
                                                                                checked={selectedWardIds.includes(ward.id)}
                                                                                onChange={(e) => {
                                                                                    if (e.target.checked) {
                                                                                        setSelectedWardIds([...selectedWardIds, ward.id]);
                                                                                    } else {
                                                                                        setSelectedWardIds(selectedWardIds.filter(id => id !== ward.id));
                                                                                    }
                                                                                }}
                                                                            />
                                                                            <label className="form-check-label line-height-1 fw-medium text-secondary-light">
                                                                                {ward.name} ({ward.code}) - {blocks.find(b => b.id === ward.block_id)?.name}
                                                                            </label>
                                                                        </div>
                                                                    ))
                                                                )
                                                            )}
                                                        </div>
                                                        <small className="text-muted">Select specific wards within the selected blocks</small>
                                                    </div> */}
                                                </>
                                            )}
                                            {activeTab === 'usg-centres' && (
                                                <>
                                                    <div className="col-12">
                                                        <label className="form-label">Address</label>
                                                        <textarea className="form-control" rows="3" value={formData.address} onChange={(e) => setFormData({...formData, address: e.target.value})} required></textarea>
                                                    </div>
                                                    <div className="col-12">
                                                        <label className="form-label">Contact Number</label>
                                                        <input 
                                                            type="text" 
                                                            className={`form-control ${mobileError ? 'is-invalid' : ''}`}
                                                            value={formData.contact_number} 
                                                            onChange={(e) => {
                                                                const formatted = formatMobileNumberInput(e.target.value);
                                                                setFormData({...formData, contact_number: formatted});
                                                                if (formatted) {
                                                                    const validation = validateMobileNumber(formatted);
                                                                    setMobileError(validation.isValid ? '' : validation.error);
                                                                } else {
                                                                    setMobileError('');
                                                                }
                                                            }}
                                                            onBlur={() => {
                                                                if (formData.contact_number) {
                                                                    const validation = validateMobileNumber(formData.contact_number);
                                                                    setMobileError(validation.isValid ? '' : validation.error);
                                                                }
                                                            }}
                                                            maxLength="10"
                                                            placeholder="Enter 10-digit mobile number"
                                                            required 
                                                        />
                                                        {mobileError && <div className="text-danger-600 text-sm mt-1">{mobileError}</div>}
                                                    </div>
                                                    <div className="col-12">
                                                        <label className="form-label">Contact Person Name (Optional)</label>
                                                        <input type="text" className="form-control" placeholder="Dr. John Doe" style={{color: '#9ca3af'}} value={formData.contact_person_name} onChange={(e) => setFormData({...formData, contact_person_name: e.target.value})} />
                                                    </div>
                                                    <div className="col-12">
                                                        <label className="form-label">Email</label>
                                                        <input type="email" className="form-control" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} required />
                                                    </div>
                                                    <div className="col-12">
                                                        <label className="form-label">Google Maps URL (Optional)</label>
                                                        <input type="url" className="form-control" placeholder="https://maps.google.com/?q=20.2961,85.8245" style={{color: '#9ca3af'}} value={formData.google_map_url} onChange={(e) => setFormData({...formData, google_map_url: e.target.value})} />
                                                        <small className="text-muted">Get URL from Google Maps: Right-click location → Share → Copy link</small>
                                                    </div>
                                                    {/* <div className="col-6">
                                                        <div className="form-check d-flex align-items-center gap-2">
                                                            <input className="form-check-input" type="checkbox" checked={formData.is_empanelled} onChange={(e) => setFormData({...formData, is_empanelled: e.target.checked})} />
                                                            <label className="form-check-label line-height-1 fw-medium text-secondary-light">Empanelled</label>
                                                        </div>
                                                    </div>
                                                    <div className="col-6">
                                                        <div className="form-check d-flex align-items-center gap-2">
                                                            <input className="form-check-input" type="checkbox" checked={formData.is_private} onChange={(e) => setFormData({...formData, is_private: e.target.checked})} />
                                                            <label className="form-check-label line-height-1 fw-medium text-secondary-light">Private Centre</label>
                                                        </div>
                                                    </div> */}
                                                </>
                                            )}
                                        </div>
                                    </div>
                                    <div className="modal-footer justify-content-center">
                                        <button type="button" className="btn btn-secondary" onClick={() => setShowAddModal(false)}>Cancel</button>
                                        <button type="submit" className="btn btn-primary">Create {activeTab === 'blocks' ? 'Block' : activeTab === 'wards' ? 'Village/Ward' : activeTab === 'sub-centres' ? 'Sub-Centre' : activeTab === 'delivery-points' ? 'Delivery Point' : 'USG Centre'}</button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                    <div className="modal-backdrop fade show" onClick={() => setShowAddModal(false)}></div>
                </>
            )}

            {/* Edit Modal */}
            {showEditModal && (selectedBlock || selectedWard || selectedSubCentre || selectedUSGCentre || selectedDeliveryPoint) && (
                <>
                    <div className="modal fade show" style={{display: 'block'}} tabIndex="-1">
                        <div className="modal-dialog modal-dialog-centered">
                            <div className="modal-content">
                                <form onSubmit={selectedBlock ? handleEditBlock : selectedWard ? handleEditWard : selectedSubCentre ? handleEditSubCentre : selectedDeliveryPoint ? handleEditDeliveryPoint : handleEditUSGCentre}>
                                    <div className="modal-header">
                                        <h5 className="modal-title">Edit {selectedBlock ? 'Block' : selectedWard ? 'Village/Ward' : selectedSubCentre ? 'Sub-Centre' : selectedDeliveryPoint ? 'Delivery Point' : 'USG Centre'}</h5>
                                        <button type="button" className="btn-close" onClick={() => { setShowEditModal(false); resetEditState(); setSelectedDeliveryPoint(null); }}></button>
                                    </div>
                                    <div className="modal-body">
                                        <div className="row g-3">
                                            <div className="col-12">
                                                <label className="form-label">{selectedBlock ? 'Block' : selectedWard ? 'Village/Ward' : selectedSubCentre ? 'Sub-Centre' : selectedDeliveryPoint ? 'Delivery Point' : 'USG Centre'} Name</label>
                                                <input type="text" className="form-control" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} required />
                                            </div>
                                            {(selectedBlock || selectedWard) && (
                                                <div className="col-12">
                                                    <label className="form-label">{selectedBlock ? 'Block' : 'Village/Ward'} Name (Regional / ଓଡ଼ିଆ)</label>
                                                    <input type="text" className="form-control" value={formData.name_regional} onChange={(e) => setFormData({...formData, name_regional: e.target.value})} placeholder="e.g. ଭୁବନେଶ୍ୱର" />
                                                </div>
                                            )}
                                            <div className="col-12">
                                                <label className="form-label">{selectedBlock ? 'Block' : selectedWard ? 'Village/Ward' : selectedDeliveryPoint ? 'Delivery Point' : 'Centre'} Code</label>
                                                <input type="text" className="form-control" value={formData.code} onChange={(e) => setFormData({...formData, code: e.target.value})} required />
                                            </div>
                                            {(selectedBlock || selectedUSGCentre) && (
                                                <div className="col-12">
                                                    <label className="form-label">District</label>
                                                    {districts.length > 0 ? (
                                                        <input 
                                                            type="text" 
                                                            className="form-control" 
                                                            value={districts.find(d => d.id === Number(formData.district_id))?.name || districts[0]?.name || ''} 
                                                            readOnly 
                                                            style={{backgroundColor: '#f8f9fa'}}
                                                        />
                                                    ) : districts.length === 1 ? (
                                                        <input 
                                                            type="text" 
                                                            className="form-control" 
                                                            value={districts[0]?.name || ''} 
                                                            readOnly 
                                                            style={{backgroundColor: '#f8f9fa'}}
                                                        />
                                                    ) : (
                                                        <input 
                                                            type="text" 
                                                            className="form-control" 
                                                            value={districts.find(d => d.id === Number(formData.district_id))?.name || ''} 
                                                            readOnly 
                                                            style={{backgroundColor: '#f8f9fa'}}
                                                        />
                                                    )}
                                                </div>
                                            )}
                                            {(selectedWard || selectedSubCentre) && (
                                                <div className="col-12">
                                                    <label className="form-label">Block</label>
                                                    <select className="form-select" value={formData.block_id} onChange={(e) => setFormData({...formData, block_id: e.target.value})} required disabled={selectedSubCentre ? true : false}>
                                                        <option value="">Select Block</option>
                                                        {blocks.map(block => (
                                                            <option key={block.id} value={block.id}>{block.name}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                            )}
                                            {(selectedSubCentre) && (
                                                <>
                                                    <div className="col-12">
                                                        <label className="form-label">Address</label>
                                                        <textarea className="form-control" rows="3" value={formData.address} onChange={(e) => setFormData({...formData, address: e.target.value})} required></textarea>
                                                    </div>
                                                    <div className="col-12">
                                                        <label className="form-label">Contact Number</label>
                                                        <input 
                                                            type="text" 
                                                            className={`form-control ${mobileError ? 'is-invalid' : ''}`}
                                                            value={formData.contact_number} 
                                                            onChange={(e) => {
                                                                const formatted = formatMobileNumberInput(e.target.value);
                                                                setFormData({...formData, contact_number: formatted});
                                                                if (formatted) {
                                                                    const validation = validateMobileNumber(formatted);
                                                                    setMobileError(validation.isValid ? '' : validation.error);
                                                                } else {
                                                                    setMobileError('');
                                                                }
                                                            }}
                                                            onBlur={() => {
                                                                if (formData.contact_number) {
                                                                    const validation = validateMobileNumber(formData.contact_number);
                                                                    setMobileError(validation.isValid ? '' : validation.error);
                                                                }
                                                            }}
                                                            maxLength="10"
                                                            placeholder="Enter 10-digit mobile number"
                                                            required 
                                                        />
                                                        {mobileError && <div className="text-danger-600 text-sm mt-1">{mobileError}</div>}
                                                    </div>
                                                    
                                                    {/* Block Mapping Section - HIDDEN (Cannot be edited) */}
                                                    {/* <div className="col-12">
                                                        <label className="form-label">Covered Blocks</label>
                                                        <div className="border rounded p-3" style={{maxHeight: '200px', overflowY: 'auto'}}>
                                                            {blocks.length === 0 ? (
                                                                <small className="text-muted">No blocks available</small>
                                                            ) : (
                                                                blocks.map(block => (
                                                                    <div key={block.id} className="form-check d-flex align-items-center gap-2 mb-2">
                                                                        <input 
                                                                            className="form-check-input" 
                                                                            type="checkbox" 
                                                                            value={block.id}
                                                                            checked={selectedBlockIds.includes(block.id)}
                                                                            onChange={(e) => {
                                                                                if (e.target.checked) {
                                                                                    setSelectedBlockIds([...selectedBlockIds, block.id]);
                                                                                } else {
                                                                                    setSelectedBlockIds(selectedBlockIds.filter(id => id !== block.id));
                                                                                }
                                                                            }}
                                                                        />
                                                                        <label className="form-check-label line-height-1 fw-medium text-secondary-light">
                                                                            {block.name} ({block.code})
                                                                        </label>
                                                                    </div>
                                                                ))
                                                            )}
                                                        </div>
                                                    </div> */}
                                                    
                                                    {/* Ward Mapping Section - HIDDEN (Cannot be edited) */}
                                                    {/* <div className="col-12">
                                                        <label className="form-label">Covered Wards</label>
                                                        <div className="border rounded p-3" style={{maxHeight: '200px', overflowY: 'auto'}}>
                                                            {selectedBlockIds.length === 0 ? (
                                                                <small className="text-muted">Select blocks first to see available wards</small>
                                                            ) : (
                                                                wards.filter(ward => selectedBlockIds.includes(ward.block_id)).length === 0 ? (
                                                                    <small className="text-muted">No wards found for selected blocks</small>
                                                                ) : (
                                                                    wards.filter(ward => selectedBlockIds.includes(ward.block_id)).map(ward => (
                                                                        <div key={ward.id} className="form-check d-flex align-items-center gap-2 mb-2">
                                                                            <input 
                                                                                className="form-check-input" 
                                                                                type="checkbox" 
                                                                                value={ward.id}
                                                                                checked={selectedWardIds.includes(ward.id)}
                                                                                onChange={(e) => {
                                                                                    if (e.target.checked) {
                                                                                        setSelectedWardIds([...selectedWardIds, ward.id]);
                                                                                    } else {
                                                                                        setSelectedWardIds(selectedWardIds.filter(id => id !== ward.id));
                                                                                    }
                                                                                }}
                                                                            />
                                                                            <label className="form-check-label line-height-1 fw-medium text-secondary-light">
                                                                                {ward.name} ({ward.code}) - {blocks.find(b => b.id === ward.block_id)?.name}
                                                                            </label>
                                                                        </div>
                                                                    ))
                                                                )
                                                            )}
                                                        </div>
                                                    </div> */}
                                                </>
                                            )}
                                            {selectedDeliveryPoint && (
                                                <>
                                                    <div className="col-12">
                                                        <label className="form-label">Block</label>
                                                        <select className="form-select" value={formData.block_id} onChange={(e) => setFormData({...formData, block_id: e.target.value})}>
                                                            <option value="">Select Block (Optional)</option>
                                                            {blocks.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                                                        </select>
                                                    </div>
                                                    <div className="col-12">
                                                        <label className="form-label">Address</label>
                                                        <textarea className="form-control" rows="3" value={formData.address} onChange={(e) => setFormData({...formData, address: e.target.value})}></textarea>
                                                    </div>
                                                    <div className="col-12">
                                                        <label className="form-label">Contact Number</label>
                                                        <input type="text" className="form-control" value={formData.contact_number} onChange={(e) => setFormData({...formData, contact_number: e.target.value})} maxLength="10" />
                                                    </div>
                                                    <div className="col-12">
                                                        <label className="form-label">Contact Person Name</label>
                                                        <input type="text" className="form-control" value={formData.contact_person_name} onChange={(e) => setFormData({...formData, contact_person_name: e.target.value})} />
                                                    </div>
                                                </>
                                            )}
                                            {selectedUSGCentre && (
                                                <>
                                                    <div className="col-12">
                                                        <label className="form-label">Covered Blocks (Optional)</label>
                                                        <div className="border rounded p-3" style={{maxHeight: '200px', overflowY: 'auto'}}>
                                                            {blocks.length === 0 ? (
                                                                <small className="text-muted">No blocks available</small>
                                                            ) : (
                                                                blocks.filter(b => b.district_id === Number(formData.district_id)).map(block => (
                                                                    <div key={block.id} className="form-check d-flex align-items-center gap-2 mb-2">
                                                                        <input 
                                                                            className="form-check-input" 
                                                                            type="checkbox" 
                                                                            value={block.id}
                                                                            checked={selectedBlockIds.includes(block.id)}
                                                                            onChange={(e) => {
                                                                                if (e.target.checked) {
                                                                                    setSelectedBlockIds([...selectedBlockIds, block.id]);
                                                                                } else {
                                                                                    setSelectedBlockIds(selectedBlockIds.filter(id => id !== block.id));
                                                                                }
                                                                            }}
                                                                        />
                                                                        <label className="form-check-label line-height-1 fw-medium text-secondary-light">
                                                                            {block.name} ({block.code})
                                                                        </label>
                                                                    </div>
                                                                ))
                                                            )}
                                                        </div>
                                                        <small className="text-muted">Select blocks that this USG centre serves</small>
                                                    </div>
                                                    <div className="col-12">
                                                        <label className="form-label">Address</label>
                                                        <textarea className="form-control" rows="3" value={formData.address} onChange={(e) => setFormData({...formData, address: e.target.value})} required></textarea>
                                                    </div>
                                                    <div className="col-12">
                                                        <label className="form-label">Contact Number</label>
                                                        <input 
                                                            type="text" 
                                                            className={`form-control ${mobileError ? 'is-invalid' : ''}`}
                                                            value={formData.contact_number} 
                                                            onChange={(e) => {
                                                                const formatted = formatMobileNumberInput(e.target.value);
                                                                setFormData({...formData, contact_number: formatted});
                                                                if (formatted) {
                                                                    const validation = validateMobileNumber(formatted);
                                                                    setMobileError(validation.isValid ? '' : validation.error);
                                                                } else {
                                                                    setMobileError('');
                                                                }
                                                            }}
                                                            onBlur={() => {
                                                                if (formData.contact_number) {
                                                                    const validation = validateMobileNumber(formData.contact_number);
                                                                    setMobileError(validation.isValid ? '' : validation.error);
                                                                }
                                                            }}
                                                            maxLength="10"
                                                            placeholder="Enter 10-digit mobile number"
                                                            required 
                                                        />
                                                        {mobileError && <div className="text-danger-600 text-sm mt-1">{mobileError}</div>}
                                                    </div>
                                                    <div className="col-12">
                                                        <label className="form-label">Contact Person Name (Optional)</label>
                                                        <input type="text" className="form-control" placeholder="Dr. John Doe" style={{color: '#9ca3af'}} value={formData.contact_person_name} onChange={(e) => setFormData({...formData, contact_person_name: e.target.value})} />
                                                    </div>
                                                    <div className="col-12">
                                                        <label className="form-label">Email</label>
                                                        <input type="email" className="form-control" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} required />
                                                    </div>
                                                    <div className="col-12">
                                                        <label className="form-label">Google Maps URL (Optional)</label>
                                                        <input type="url" className="form-control" placeholder="https://maps.google.com/?q=20.2961,85.8245" style={{color: '#9ca3af'}} value={formData.google_map_url} onChange={(e) => setFormData({...formData, google_map_url: e.target.value})} />
                                                        <small className="text-muted">Get URL from Google Maps: Right-click location → Share → Copy link</small>
                                                    </div>
                                                    {/* <div className="col-6">
                                                        <div className="form-check d-flex align-items-center gap-2">
                                                            <input className="form-check-input" type="checkbox" checked={formData.is_empanelled} onChange={(e) => setFormData({...formData, is_empanelled: e.target.checked})} />
                                                            <label className="form-check-label line-height-1 fw-medium text-secondary-light">Empanelled</label>
                                                        </div>
                                                    </div>
                                                    <div className="col-6">
                                                        <div className="form-check d-flex align-items-center gap-2">
                                                            <input className="form-check-input" type="checkbox" checked={formData.is_private} onChange={(e) => setFormData({...formData, is_private: e.target.checked})} />
                                                            <label className="form-check-label line-height-1 fw-medium text-secondary-light">Private Centre</label>
                                                        </div>
                                                    </div> */}
                                                </>
                                            )}
                                        </div>
                                    </div>
                                    <div className="modal-footer justify-content-center">
                                        <button type="button" className="btn btn-secondary" onClick={() => { setShowEditModal(false); resetEditState(); }}>Cancel</button>
                                        <button type="submit" className="btn btn-primary">Update {selectedBlock ? 'Block' : selectedWard ? 'Village/Ward' : selectedSubCentre ? 'Sub-Centre' : 'USG Centre'}</button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                    <div className="modal-backdrop fade show" onClick={() => { setShowEditModal(false); resetEditState(); }}></div>
                </>
            )}

            {/* Delete Modal */}
            {showDeleteModal && (selectedBlock || selectedWard || selectedSubCentre || selectedUSGCentre) && (
                <>
                    <div className="modal fade show" style={{display: 'block'}} tabIndex="-1">
                        <div className="modal-dialog modal-dialog-centered">
                            <div className="modal-content">
                                <div className="modal-header">
                                    <h5 className="modal-title">Confirm Delete</h5>
                                    <button type="button" className="btn-close" onClick={() => setShowDeleteModal(false)}></button>
                                </div>
                                <div className="modal-body">
                                    <p>Are you sure you want to deactivate the {selectedBlock ? 'block' : selectedWard ? 'village/ward' : selectedSubCentre ? 'sub-centre' : 'USG centre'} <strong>{selectedBlock ? selectedBlock.name : selectedWard ? selectedWard.name : selectedSubCentre ? selectedSubCentre.name : selectedUSGCentre?.name}</strong>? This action cannot be undone.</p>
                                </div>
                                <div className="modal-footer justify-content-center">
                                    <button type="button" className="btn btn-secondary" onClick={() => setShowDeleteModal(false)}>Cancel</button>
                                    <button type="button" className="btn btn-danger" onClick={selectedBlock ? handleDeleteBlock : selectedWard ? handleDeleteWard : selectedSubCentre ? handleDeleteSubCentre : handleDeleteUSGCentre}>Deactivate</button>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="modal-backdrop fade show" onClick={() => setShowDeleteModal(false)}></div>
                </>
            )}

            {/* View USG Centre Modal */}
            {showViewModal && selectedUSGCentre && !selectedSubCentre && (
                <>
                    <div className="modal fade show" style={{display: 'block'}} tabIndex="-1">
                        <div className="modal-dialog modal-dialog-centered">
                            <div className="modal-content">
                                <div className="modal-header">
                                    <h5 className="modal-title">USG Centre Details</h5>
                                    <button type="button" className="btn-close" onClick={() => setShowViewModal(false)}></button>
                                </div>
                                <div className="modal-body">
                                    <div className="row g-3">
                                        <div className="col-12">
                                            <div className="p-16 radius-8 bg-neutral-50">
                                                <span className="text-secondary-light fw-medium">Centre Name :</span>
                                                <span className="ms-12 fw-semibold text-neutral-600">{selectedUSGCentre.name}</span>
                                            </div>
                                        </div>
                                        <div className="col-md-6">
                                            <div className="p-16 radius-8 bg-neutral-50">
                                                <span className="text-secondary-light fw-medium">Centre Code :</span>
                                                <span className="ms-12 fw-semibold text-neutral-600">{selectedUSGCentre.code}</span>
                                            </div>
                                        </div>
                                        <div className="col-md-6">
                                            <div className="p-16 radius-8 bg-neutral-50">
                                                <span className="text-secondary-light fw-medium">District :</span>
                                                <span className="ms-12 fw-semibold text-neutral-600">{districts.find(d => d.id === selectedUSGCentre.district_id)?.name || 'N/A'}</span>
                                            </div>
                                        </div>
                                        <div className="col-12">
                                            <div className="p-16 radius-8 bg-neutral-50">
                                                <span className="text-secondary-light fw-medium">Covered Blocks :</span>
                                                <span className="ms-12 fw-semibold text-neutral-600">
                                                    {selectedUSGCentre.block_ids && selectedUSGCentre.block_ids.length > 0 ? (
                                                        selectedUSGCentre.block_ids.map(blockId => blocks.find(b => b.id === blockId)?.name).filter(Boolean).join(', ')
                                                    ) : 'Not specified'}
                                                </span>
                                            </div>
                                        </div>
                                        {/* <div className="col-md-6">
                                            <div className="p-16 radius-8 bg-neutral-50">
                                                <span className="text-secondary-light fw-medium">Empanelled :</span>
                                                <span className="ms-12">
                                                    <span className={`px-24 py-4 rounded-pill fw-medium text-sm ${
                                                        selectedUSGCentre.is_empanelled 
                                                            ? 'bg-success-focus text-success-main' 
                                                            : 'bg-neutral-200 text-neutral-600'
                                                    }`}>
                                                        {selectedUSGCentre.is_empanelled ? 'Yes' : 'No'}
                                                    </span>
                                                </span>
                                            </div>
                                        </div>
                                        <div className="col-md-6">
                                            <div className="p-16 radius-8 bg-neutral-50">
                                                <span className="text-secondary-light fw-medium">Type :</span>
                                                <span className="ms-12">
                                                    <span className={`px-24 py-4 rounded-pill fw-medium text-sm ${
                                                        selectedUSGCentre.is_private 
                                                            ? 'bg-warning-focus text-warning-main' 
                                                            : 'bg-info-focus text-info-main'
                                                    }`}>
                                                        {selectedUSGCentre.is_private ? 'Private' : 'Government'}
                                                    </span>
                                                </span>
                                            </div>
                                        </div> */}
                                        <div className="col-md-6">
                                            <div className="p-16 radius-8 bg-neutral-50">
                                                <span className="text-secondary-light fw-medium">Status :</span>
                                                <span className="ms-12">
                                                    <span className={`px-24 py-4 rounded-pill fw-medium text-sm ${
                                                        selectedUSGCentre.is_active 
                                                            ? 'bg-success-focus text-success-main' 
                                                            : 'bg-neutral-200 text-neutral-600'
                                                    }`}>
                                                        {selectedUSGCentre.is_active ? 'Active' : 'Inactive'}
                                                    </span>
                                                </span>
                                            </div>
                                        </div>
                                        <div className="col-md-6">
                                            <div className="p-16 radius-8 bg-neutral-50">
                                                <span className="text-secondary-light fw-medium">Contact Number :</span>
                                                <span className="ms-12 fw-semibold text-neutral-600">{selectedUSGCentre.contact_number}</span>
                                            </div>
                                        </div>
                                        <div className="col-md-6">
                                            <div className="p-16 radius-8 bg-neutral-50">
                                                <span className="text-secondary-light fw-medium">Contact Person :</span>
                                                <span className="ms-12 fw-semibold text-neutral-600">{selectedUSGCentre.contact_person_name || 'Not provided'}</span>
                                            </div>
                                        </div>
                                        <div className="col-md-6">
                                            <div className="p-16 radius-8 bg-neutral-50">
                                                <span className="text-secondary-light fw-medium">Email :</span>
                                                <span className="ms-12 fw-semibold text-neutral-600">{selectedUSGCentre.email}</span>
                                            </div>
                                        </div>
                                        <div className="col-md-6">
                                            <div className="p-16 radius-8 bg-neutral-50">
                                                <span className="text-secondary-light fw-medium">Location :</span>
                                                <span className="ms-12 fw-semibold text-neutral-600">
                                                    {selectedUSGCentre.google_map_url ? (
                                                        <a href={selectedUSGCentre.google_map_url} target="_blank" rel="noopener noreferrer" className="text-primary-600">
                                                            <Icon icon="mdi:map-marker" className="me-1" />View on Map
                                                        </a>
                                                    ) : 'Not provided'}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="col-12">
                                            <div className="p-16 radius-8 bg-neutral-50">
                                                <span className="text-secondary-light fw-medium">Address :</span>
                                                <span className="ms-12 fw-semibold text-neutral-600">{selectedUSGCentre.address}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="modal-footer justify-content-center">
                                    <button type="button" className="btn btn-secondary" onClick={() => setShowViewModal(false)}>Close</button>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="modal-backdrop fade show" onClick={() => setShowViewModal(false)}></div>
                </>
            )}


        </div>
    );
};

export default AdministrativeManagementLayer;
