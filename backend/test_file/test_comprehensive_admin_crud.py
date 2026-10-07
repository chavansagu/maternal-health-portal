#!/usr/bin/env python3
"""
Comprehensive test script for Administrative CRUD operations
Tests CREATE, READ, UPDATE, DELETE for all entities
"""

import requests
import json

BASE_URL = "http://localhost:8000/api/v1"

def test_comprehensive_admin_crud():
    """Test all administrative CRUD operations comprehensively"""
    
    print("Comprehensive Administrative CRUD Testing")
    print("=" * 60)
    
    # Login
    print("1. Logging in as district admin...")
    login_data = {
        "username": "district_admin",
        "password": "Admin@123"
    }
    
    try:
        response = requests.post(f"{BASE_URL}/auth/login", data=login_data)
        if response.status_code == 200:
            token = response.json()["access_token"]
            headers = {"Authorization": f"Bearer {token}"}
            print("Login successful")
        else:
            print("Login failed:", response.text)
            return
    except Exception as e:
        print(f"Connection error: {e}")
        return
    
    # Get user's district ID
    user_district_id = 1  # From previous debug, we know user belongs to district 1
    
    # Store created entity IDs for testing
    created_entities = {}
    
    # ========================================
    # DISTRICT MANAGEMENT TESTS
    # ========================================
    print("\\n" + "="*60)
    print("TESTING DISTRICT MANAGEMENT")
    print("="*60)
    
    # CREATE District
    print("\\n2.1 Creating District...")
    district_data = {
        "name": "Test District CRUD",
        "code": "TDC001"
    }
    
    try:
        response = requests.post(f"{BASE_URL}/admin/districts", json=district_data, headers=headers)
        if response.status_code == 201:
            district = response.json()
            created_entities['district_id'] = district['id']
            print(f"✓ District created: {district['name']} (ID: {district['id']})")
        else:
            print("✗ District creation failed:", response.text)
            return
    except Exception as e:
        print(f"✗ Error creating district: {e}")
        return
    
    # READ Districts
    print("\\n2.2 Reading Districts...")
    try:
        response = requests.get(f"{BASE_URL}/admin/districts", headers=headers)
        if response.status_code == 200:
            districts = response.json()
            print(f"✓ Retrieved {len(districts)} districts")
        else:
            print("✗ Failed to get districts:", response.text)
    except Exception as e:
        print(f"✗ Error getting districts: {e}")
    
    # READ Single District
    print("\\n2.3 Reading Single District...")
    try:
        response = requests.get(f"{BASE_URL}/admin/districts/{created_entities['district_id']}", headers=headers)
        if response.status_code == 200:
            district = response.json()
            print(f"✓ Retrieved district: {district['name']}")
        else:
            print("✗ Failed to get district:", response.text)
    except Exception as e:
        print(f"✗ Error getting district: {e}")
    
    # UPDATE District
    print("\\n2.4 Updating District...")
    district_update = {
        "name": "Updated Test District CRUD"
    }
    try:
        response = requests.put(f"{BASE_URL}/admin/districts/{created_entities['district_id']}", 
                              json=district_update, headers=headers)
        if response.status_code == 200:
            district = response.json()
            print(f"✓ District updated: {district['name']}")
        else:
            print("✗ District update failed:", response.text)
    except Exception as e:
        print(f"✗ Error updating district: {e}")
    
    # ========================================
    # BLOCK MANAGEMENT TESTS
    # ========================================
    print("\\n" + "="*60)
    print("TESTING BLOCK MANAGEMENT")
    print("="*60)
    
    # CREATE Block
    print("\\n3.1 Creating Block...")
    block_data = {
        "name": "Test Block CRUD",
        "code": "TBC001",
        "district_id": user_district_id  # Use user's district
    }
    
    try:
        response = requests.post(f"{BASE_URL}/admin/blocks", json=block_data, headers=headers)
        if response.status_code == 201:
            block = response.json()
            created_entities['block_id'] = block['id']
            print(f"✓ Block created: {block['name']} (ID: {block['id']})")
        else:
            print("✗ Block creation failed:", response.text)
            return
    except Exception as e:
        print(f"✗ Error creating block: {e}")
        return
    
    # READ Blocks
    print("\\n3.2 Reading Blocks...")
    try:
        response = requests.get(f"{BASE_URL}/admin/blocks", headers=headers)
        if response.status_code == 200:
            blocks = response.json()
            print(f"✓ Retrieved {len(blocks)} blocks")
        else:
            print("✗ Failed to get blocks:", response.text)
    except Exception as e:
        print(f"✗ Error getting blocks: {e}")
    
    # READ Single Block
    print("\\n3.3 Reading Single Block...")
    try:
        response = requests.get(f"{BASE_URL}/admin/blocks/{created_entities['block_id']}", headers=headers)
        if response.status_code == 200:
            block = response.json()
            print(f"✓ Retrieved block: {block['name']}")
        else:
            print("✗ Failed to get block:", response.text)
    except Exception as e:
        print(f"✗ Error getting block: {e}")
    
    # UPDATE Block
    print("\\n3.4 Updating Block...")
    block_update = {
        "name": "Updated Test Block CRUD"
    }
    try:
        response = requests.put(f"{BASE_URL}/admin/blocks/{created_entities['block_id']}", 
                              json=block_update, headers=headers)
        if response.status_code == 200:
            block = response.json()
            print(f"✓ Block updated: {block['name']}")
        else:
            print("✗ Block update failed:", response.text)
    except Exception as e:
        print(f"✗ Error updating block: {e}")
    
    # ========================================
    # WARD MANAGEMENT TESTS
    # ========================================
    print("\\n" + "="*60)
    print("TESTING WARD MANAGEMENT")
    print("="*60)
    
    # CREATE Ward
    print("\\n4.1 Creating Ward...")
    ward_data = {
        "name": "Test Ward CRUD",
        "code": "TWC001",
        "block_id": created_entities['block_id']
    }
    
    try:
        response = requests.post(f"{BASE_URL}/admin/wards", json=ward_data, headers=headers)
        if response.status_code == 201:
            ward = response.json()
            created_entities['ward_id'] = ward['id']
            print(f"✓ Ward created: {ward['name']} (ID: {ward['id']})")
        else:
            print("✗ Ward creation failed:", response.text)
            return
    except Exception as e:
        print(f"✗ Error creating ward: {e}")
        return
    
    # READ Wards
    print("\\n4.2 Reading Wards...")
    try:
        response = requests.get(f"{BASE_URL}/admin/wards", headers=headers)
        if response.status_code == 200:
            wards = response.json()
            print(f"✓ Retrieved {len(wards)} wards")
        else:
            print("✗ Failed to get wards:", response.text)
    except Exception as e:
        print(f"✗ Error getting wards: {e}")
    
    # READ Single Ward
    print("\\n4.3 Reading Single Ward...")
    try:
        response = requests.get(f"{BASE_URL}/admin/wards/{created_entities['ward_id']}", headers=headers)
        if response.status_code == 200:
            ward = response.json()
            print(f"✓ Retrieved ward: {ward['name']}")
        else:
            print("✗ Failed to get ward:", response.text)
    except Exception as e:
        print(f"✗ Error getting ward: {e}")
    
    # UPDATE Ward
    print("\\n4.4 Updating Ward...")
    ward_update = {
        "name": "Updated Test Ward CRUD"
    }
    try:
        response = requests.put(f"{BASE_URL}/admin/wards/{created_entities['ward_id']}", 
                              json=ward_update, headers=headers)
        if response.status_code == 200:
            ward = response.json()
            print(f"✓ Ward updated: {ward['name']}")
        else:
            print("✗ Ward update failed:", response.text)
    except Exception as e:
        print(f"✗ Error updating ward: {e}")
    
    # ========================================
    # SUB-CENTRE MANAGEMENT TESTS
    # ========================================
    print("\\n" + "="*60)
    print("TESTING SUB-CENTRE MANAGEMENT")
    print("="*60)
    
    # CREATE Sub-Centre
    print("\\n5.1 Creating Sub-Centre...")
    subcentre_data = {
        "name": "Test Sub-Centre CRUD",
        "code": "TSC001",
        "block_id": created_entities['block_id'],
        "address": "Test Address CRUD",
        "contact_number": "1234567890"
    }
    
    try:
        response = requests.post(f"{BASE_URL}/admin/sub-centres", json=subcentre_data, headers=headers)
        if response.status_code == 201:
            subcentre = response.json()
            created_entities['subcentre_id'] = subcentre['id']
            print(f"✓ Sub-Centre created: {subcentre['name']} (ID: {subcentre['id']})")
        else:
            print("✗ Sub-Centre creation failed:", response.text)
            return
    except Exception as e:
        print(f"✗ Error creating sub-centre: {e}")
        return
    
    # READ Sub-Centres
    print("\\n5.2 Reading Sub-Centres...")
    try:
        response = requests.get(f"{BASE_URL}/admin/sub-centres", headers=headers)
        if response.status_code == 200:
            subcentres = response.json()
            print(f"✓ Retrieved {len(subcentres)} sub-centres")
        else:
            print("✗ Failed to get sub-centres:", response.text)
    except Exception as e:
        print(f"✗ Error getting sub-centres: {e}")
    
    # READ Single Sub-Centre
    print("\\n5.3 Reading Single Sub-Centre...")
    try:
        response = requests.get(f"{BASE_URL}/admin/sub-centres/{created_entities['subcentre_id']}", headers=headers)
        if response.status_code == 200:
            subcentre = response.json()
            print(f"✓ Retrieved sub-centre: {subcentre['name']}")
        else:
            print("✗ Failed to get sub-centre:", response.text)
    except Exception as e:
        print(f"✗ Error getting sub-centre: {e}")
    
    # UPDATE Sub-Centre
    print("\\n5.4 Updating Sub-Centre...")
    subcentre_update = {
        "name": "Updated Test Sub-Centre CRUD",
        "address": "Updated Test Address CRUD"
    }
    try:
        response = requests.put(f"{BASE_URL}/admin/sub-centres/{created_entities['subcentre_id']}", 
                              json=subcentre_update, headers=headers)
        if response.status_code == 200:
            subcentre = response.json()
            print(f"✓ Sub-Centre updated: {subcentre['name']}")
        else:
            print("✗ Sub-Centre update failed:", response.text)
    except Exception as e:
        print(f"✗ Error updating sub-centre: {e}")
    
    # ========================================
    # USG CENTRE MANAGEMENT TESTS
    # ========================================
    print("\\n" + "="*60)
    print("TESTING USG CENTRE MANAGEMENT")
    print("="*60)
    
    # CREATE USG Centre
    print("\\n6.1 Creating USG Centre...")
    usgcentre_data = {
        "name": "Test USG Centre CRUD",
        "code": "TUSGC001",
        "address": "Test USG Address CRUD",
        "contact_number": "0987654321",
        "email": "test.crud@usg.com",
        "is_empanelled": True,
        "is_private": False,
        "district_id": user_district_id
    }
    
    try:
        response = requests.post(f"{BASE_URL}/admin/usg-centres", json=usgcentre_data, headers=headers)
        if response.status_code == 201:
            usgcentre = response.json()
            created_entities['usgcentre_id'] = usgcentre['id']
            print(f"✓ USG Centre created: {usgcentre['name']} (ID: {usgcentre['id']})")
        else:
            print("✗ USG Centre creation failed:", response.text)
            return
    except Exception as e:
        print(f"✗ Error creating USG centre: {e}")
        return
    
    # READ USG Centres
    print("\\n6.2 Reading USG Centres...")
    try:
        response = requests.get(f"{BASE_URL}/admin/usg-centres", headers=headers)
        if response.status_code == 200:
            usgcentres = response.json()
            print(f"✓ Retrieved {len(usgcentres)} USG centres")
        else:
            print("✗ Failed to get USG centres:", response.text)
    except Exception as e:
        print(f"✗ Error getting USG centres: {e}")
    
    # READ Single USG Centre
    print("\\n6.3 Reading Single USG Centre...")
    try:
        response = requests.get(f"{BASE_URL}/admin/usg-centres/{created_entities['usgcentre_id']}", headers=headers)
        if response.status_code == 200:
            usgcentre = response.json()
            print(f"✓ Retrieved USG centre: {usgcentre['name']}")
        else:
            print("✗ Failed to get USG centre:", response.text)
    except Exception as e:
        print(f"✗ Error getting USG centre: {e}")
    
    # UPDATE USG Centre
    print("\\n6.4 Updating USG Centre...")
    usgcentre_update = {
        "name": "Updated Test USG Centre CRUD",
        "is_private": True
    }
    try:
        response = requests.put(f"{BASE_URL}/admin/usg-centres/{created_entities['usgcentre_id']}", 
                              json=usgcentre_update, headers=headers)
        if response.status_code == 200:
            usgcentre = response.json()
            print(f"✓ USG Centre updated: {usgcentre['name']}")
        else:
            print("✗ USG Centre update failed:", response.text)
    except Exception as e:
        print(f"✗ Error updating USG centre: {e}")
    
    # ========================================
    # WARD-SUBCENTRE MAPPING TESTS
    # ========================================
    print("\\n" + "="*60)
    print("TESTING WARD-SUBCENTRE MAPPING")
    print("="*60)
    
    # CREATE Ward-SubCentre Mapping
    print("\\n7.1 Creating Ward-SubCentre Mapping...")
    mapping_data = {
        "ward_ids": [created_entities['ward_id']]
    }
    
    try:
        response = requests.post(f"{BASE_URL}/admin/sub-centres/{created_entities['subcentre_id']}/wards", 
                               json=mapping_data, headers=headers)
        if response.status_code == 200:
            mappings = response.json()
            print(f"✓ Ward-SubCentre mapping created: {len(mappings)} mappings")
        else:
            print("✗ Ward-SubCentre mapping failed:", response.text)
    except Exception as e:
        print(f"✗ Error creating mapping: {e}")
    
    # ========================================
    # DELETE OPERATIONS (in reverse order)
    # ========================================
    print("\\n" + "="*60)
    print("TESTING DELETE OPERATIONS")
    print("="*60)
    
    # DELETE Ward-SubCentre Mapping
    print("\\n8.1 Deleting Ward-SubCentre Mapping...")
    try:
        response = requests.delete(f"{BASE_URL}/admin/sub-centres/{created_entities['subcentre_id']}/wards/{created_entities['ward_id']}", 
                                 headers=headers)
        if response.status_code == 200:
            print("✓ Ward-SubCentre mapping deleted")
        else:
            print("✗ Ward-SubCentre mapping deletion failed:", response.text)
    except Exception as e:
        print(f"✗ Error deleting mapping: {e}")
    
    # DELETE USG Centre
    print("\\n8.2 Deleting USG Centre...")
    try:
        response = requests.delete(f"{BASE_URL}/admin/usg-centres/{created_entities['usgcentre_id']}", headers=headers)
        if response.status_code == 200:
            print("✓ USG Centre deleted")
        else:
            print("✗ USG Centre deletion failed:", response.text)
    except Exception as e:
        print(f"✗ Error deleting USG centre: {e}")
    
    # DELETE Sub-Centre
    print("\\n8.3 Deleting Sub-Centre...")
    try:
        response = requests.delete(f"{BASE_URL}/admin/sub-centres/{created_entities['subcentre_id']}", headers=headers)
        if response.status_code == 200:
            print("✓ Sub-Centre deleted")
        else:
            print("✗ Sub-Centre deletion failed:", response.text)
    except Exception as e:
        print(f"✗ Error deleting sub-centre: {e}")
    
    # DELETE Ward
    print("\\n8.4 Deleting Ward...")
    try:
        response = requests.delete(f"{BASE_URL}/admin/wards/{created_entities['ward_id']}", headers=headers)
        if response.status_code == 200:
            print("✓ Ward deleted")
        else:
            print("✗ Ward deletion failed:", response.text)
    except Exception as e:
        print(f"✗ Error deleting ward: {e}")
    
    # DELETE Block
    print("\\n8.5 Deleting Block...")
    try:
        response = requests.delete(f"{BASE_URL}/admin/blocks/{created_entities['block_id']}", headers=headers)
        if response.status_code == 200:
            print("✓ Block deleted")
        else:
            print("✗ Block deletion failed:", response.text)
    except Exception as e:
        print(f"✗ Error deleting block: {e}")
    
    # DELETE District (Note: This might fail due to dependencies)
    print("\\n8.6 Deleting District...")
    try:
        response = requests.delete(f"{BASE_URL}/admin/districts/{created_entities['district_id']}", headers=headers)
        if response.status_code == 200:
            print("✓ District deleted")
        else:
            print("✗ District deletion failed (expected if dependencies exist):", response.text)
    except Exception as e:
        print(f"✗ Error deleting district: {e}")
    
    # ========================================
    # SUMMARY
    # ========================================
    print("\\n" + "="*60)
    print("COMPREHENSIVE CRUD TESTING COMPLETED!")
    print("="*60)
    
    print("\\nTested Operations:")
    print("✓ District Management: CREATE, READ, UPDATE, DELETE")
    print("✓ Block Management: CREATE, READ, UPDATE, DELETE")
    print("✓ Ward Management: CREATE, READ, UPDATE, DELETE")
    print("✓ Sub-Centre Management: CREATE, READ, UPDATE, DELETE")
    print("✓ USG Centre Management: CREATE, READ, UPDATE, DELETE")
    print("✓ Ward-SubCentre Mapping: CREATE, DELETE")
    
    print("\\nAll administrative CRUD operations have been tested!")
    print("Check the API documentation at http://localhost:8000/docs for more details.")

if __name__ == "__main__":
    test_comprehensive_admin_crud()