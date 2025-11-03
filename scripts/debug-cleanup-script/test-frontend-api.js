// Script de test pour simuler ce que fait le frontend AdminVideos
const axios = require('axios');

async function testFrontendAPI() {
  console.log('🧪 Test Frontend API - Simulation AdminVideos\n');

  try {
    // Simuler l'appel API comme le fait le frontend
    const API_BASE_URL = 'http://localhost:5000/api';
    const api = axios.create({
      baseURL: API_BASE_URL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Ajouter le token d'authentification (simulé)
    const token = 'test-token'; // En production, viendrait de localStorage
    if (token) {
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }

    console.log('📡 Test 1: Appel API /videos (comme AdminVideos)');
    const response = await api.get('/videos');
    console.log('✅ API Response Status:', response.status);
    console.log('📊 Response Data Structure:', Object.keys(response.data));

    if (response.data.success) {
      console.log('✅ API Success:', response.data.success);
      console.log('📊 Count:', response.data.count);
      console.log('📊 Has data array:', !!response.data.data);
      console.log('📊 Data length:', response.data.data?.length || 0);

      if (response.data.data && response.data.data.length > 0) {
        console.log('\n📹 Vidéos trouvées:');
        response.data.data.forEach((video, index) => {
          console.log(`  ${index + 1}. "${video.title}"`);
          console.log(`     - Order: ${video.order}`);
          console.log(`     - Published: ${video.isPublished}`);
          console.log(`     - ID: ${video._id}`);
          console.log('');
        });
      }
    }

    console.log('\n🧠 Test 2: Simulation du reducer Redux');
    const payload = response.data; // Ce que reçoit le reducer

    // Ancien reducer (❌ incorrect)
    const oldVideos = payload.videos || payload;
    console.log('❌ Ancien reducer - videos:', Array.isArray(oldVideos) ? oldVideos.length : 'undefined');

    // Nouveau reducer (✅ correct)
    const newVideos = payload.data || payload.videos || payload;
    console.log('✅ Nouveau reducer - data:', Array.isArray(newVideos) ? newVideos.length : 'undefined');

    console.log('\n📊 Test 3: Filtrage comme AdminVideos');
    const publishedVideos = newVideos.filter(video => video.isPublished === true);
    console.log('✅ Vidéos publiées:', publishedVideos.length);
    console.log('❌ Vidéos non publiées:', newVideos.length - publishedVideos.length);

    if (publishedVideos.length > 0) {
      console.log('\n📋 Vidéos qui devraient apparaître dans AdminVideos:');
      publishedVideos.forEach(video => {
        console.log(`  ✅ "${video.title}" (order: ${video.order})`);
      });
    }

    console.log('\n🎯 Conclusion:');
    if (publishedVideos.length > 0) {
      console.log('✅ Les vidéos devraient maintenant apparaître dans /admin/videos');
      console.log('✅ Le reducer Redux a été corrigé');
      console.log('✅ Les vidéos sont marquées comme isPublished: true');
    } else {
      console.log('⚠️ Aucune vidéo publiée trouvée');
      console.log('💡 Vérifiez que les vidéos sont marquées comme isPublished: true en BD');
    }

  } catch (error) {
    console.error('❌ Erreur API:', error.message);
    if (error.response) {
      console.error('❌ Status:', error.response.status);
      console.error('❌ Data:', error.response.data);
    }
  }
}

testFrontendAPI();
