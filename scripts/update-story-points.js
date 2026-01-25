// Run this script to update all existing news stories to 10 points
// Usage: node scripts/update-story-points.js

async function updateStoryPoints() {
    try {
        const response = await fetch('http://localhost:3000/api/admin/update-story-points', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                secret: 'admin-earnapp-2024',
                newPoints: 10
            })
        })

        const data = await response.json()

        if (data.success) {
            console.log('✅ Success:', data.message)
        } else {
            console.error('❌ Error:', data.error)
        }
    } catch (error) {
        console.error('❌ Failed to update story points:', error.message)
    }
}

updateStoryPoints()
