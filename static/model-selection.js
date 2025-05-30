// New code for model selection button
document.addEventListener('DOMContentLoaded', () => {
    // Variables for model selection
    const modelButton = document.getElementById('model-button');
    const modelMenu = document.getElementById('model-menu');
    const plusButton = document.getElementById('plus-button');
    const plusMenu = document.getElementById('plus-menu');

    // Store current model
    let currentModel = 'mistral:7b'; // Default model
    modelButton.setAttribute('data-current-model', currentModel);

    // Function to fetch available models from the API
    async function fetchModels() {
        try {
            const response = await fetch(window.CHAT_CONFIG.API.MODELS);
            if (!response.ok) {
                throw new Error('Failed to fetch models');
            }
            const data = await response.json();
            return data.models || [];
        } catch (error) {
            console.error('Error fetching models:', error);
            return [];
        }
    }

    // Populate model menu with available models
    function populateModelMenu(models) {
        // Clear existing items
        modelMenu.innerHTML = '';

        // Add search box if there are many models
        if (models.length > 5) {
            const searchContainer = document.createElement('div');
            searchContainer.className = 'model-search-container';

            const searchInput = document.createElement('input');
            searchInput.type = 'text';
            searchInput.className = 'model-search';
            searchInput.placeholder = 'Search models...';
            searchInput.addEventListener('input', (e) => {
                const searchTerm = e.target.value.toLowerCase();
                document.querySelectorAll('.model-item').forEach(item => {
                    const modelName = item.textContent.toLowerCase();
                    if (modelName.includes(searchTerm)) {
                        item.style.display = 'block';
                    } else {
                        item.style.display = 'none';
                    }
                });
            });

            // Prevent closing the menu when clicking in the search box
            searchInput.addEventListener('click', (e) => {
                e.stopPropagation();
            });

            searchContainer.appendChild(searchInput);
            modelMenu.appendChild(searchContainer);
        }

        // Add models to menu
        models.forEach(model => {
            const modelItem = document.createElement('div');
            modelItem.className = 'plus-menu-item model-item';
            modelItem.setAttribute('data-model', model.name);
            modelItem.textContent = model.name;

            // Check if this is the current model
            if (model.name === currentModel) {
                modelItem.classList.add('active');
            }

            // Add click event listener
            modelItem.addEventListener('click', () => {
                const selectedModel = model.name;
                currentModel = selectedModel;
                modelButton.setAttribute('data-current-model', currentModel);

                // Update button text to first letter of model
                modelButton.textContent = selectedModel.charAt(0).toUpperCase();

                // Update display
                document.querySelectorAll('.model-item').forEach(mi => mi.classList.remove('active'));
                modelItem.classList.add('active');

                // Close menu
                modelMenu.classList.remove('show');
            });

            modelMenu.appendChild(modelItem);
        });
    }

    // Load models when the page loads
    fetchModels().then(models => {
        populateModelMenu(models);

        // Set initial button text to first letter of default model
        const foundModel = models.find(m => m.name === currentModel);
        if (foundModel) {
            modelButton.textContent = currentModel.charAt(0).toUpperCase();
        } else if (models.length > 0) {
            // If default model not found, use the first available model
            currentModel = models[0].name;
            modelButton.setAttribute('data-current-model', currentModel);
            modelButton.textContent = currentModel.charAt(0).toUpperCase();
        }
    }).catch(error => {
        console.error('Failed to load models:', error);
        // Add fallback models in case API fails
        const fallbackModels = [
            { name: 'llama2' },
            { name: 'mistral:7b' }
        ];
        populateModelMenu(fallbackModels);
        modelButton.textContent = 'M';
    });

    // Toggle model menu
    modelButton.addEventListener('click', (e) => {
        e.stopPropagation();

        // Close plus menu if it's open
        if (plusMenu.classList.contains('show')) {
            plusMenu.classList.remove('show');
        }

        modelMenu.classList.toggle('show');
    });

    // Close model menu when clicking outside
    document.addEventListener('click', (e) => {
        if (modelMenu.classList.contains('show') && !modelButton.contains(e.target) && !modelMenu.contains(e.target)) {
            modelMenu.classList.remove('show');
        }
    });

    // Initialize the button text to first letter of default model
    modelButton.textContent = currentModel.charAt(0).toUpperCase();
});

// Function to get current model (to be used in existing code)
function getCurrentModel() {
    const modelButton = document.getElementById('model-button');
    return modelButton.getAttribute('data-current-model') || 'mistral:7b';
}
