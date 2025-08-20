import Fuse from 'fuse.js'

export default function combinedSingleObjectMatchSearch(searchTerms, materials) {
    const results = [];

    // Define keys for Fuse.js to search within the MaterialItem objects
    // It's good practice to ensure these properties exist and are strings when using them directly.
    const fuseKeys = ['name', 'sku', 'description', 'category'];

    const fuseOptions = {
        keys: fuseKeys, // Now specifying which object properties to search
        includeScore: true, // Needed to rank results
        threshold: 0.4,     // Adjust for fuzziness
        distance: 100,      // Max distance for a match
    };

    // Initialize Fuse with the data and options
    const fuse = new Fuse(materials, fuseOptions);

    searchTerms.forEach((term) => {
        const lowerCaseTerm = term.toLowerCase();
        let bestMatch = null;
        let foundExactMatch = false;

        // --- Step 1: Attempt exact substring match (case-insensitive) in the 'name' property ---
        for (const material of materials) {
            // **FIX: Add a check for material.name being a string before calling toLowerCase()**
            if (typeof material.name === 'string' && material.name.toLowerCase().includes(lowerCaseTerm)) {
                bestMatch = material;
                foundExactMatch = true;
                break;
            }

            if (typeof material.description === 'string' && material.description.toLowerCase().includes(lowerCaseTerm)) {
                bestMatch = material;
                foundExactMatch = true;
                break;
            }
        }

        // --- Step 2: If no exact match, fall back to Fuse.js fuzzy search ---
        if (!foundExactMatch) {
            // console.log(`No direct match for "${term}" in material names. Falling back to fuzzy search...`);
            const fuseMatches = fuse.search(term);
            // console.log(`Fuzzy search results for "${term}":`, fuseMatches);

            if (fuseMatches.length > 0) {
                bestMatch = fuseMatches[0].item;
            } else {
                bestMatch = null;
            }
        }
        if (bestMatch) {
            results.push({ ...bestMatch, search_term: term });
        } else {
            const wordsByTwo = groupWordsByTwo(lowerCaseTerm.split(' '))
            for (const [index, word] of wordsByTwo.entries()) {
                const fuseMatches = fuse.search(word);
                if (fuseMatches.length > 0) {
                    const match = fuseMatches[0].item;
                    results.push({ ...match, search_term: term });
                    break;
                } else {
                    if (index === wordsByTwo.length - 1) {
                        results.push({
                            search_term: term,
                            name: term,
                            cost: 0,
                         });
                        console.log(`No matches found for word: ${term} - ${word}`);
                    }
                    
                }
            }
        }
    });

    return results;
}

function groupWordsByTwo(inputArray) {
    // This will hold our final result of grouped strings.
    const groupedArray = [];

    // Loop through the input array, incrementing the counter by 2 each time.
    for (let i = 0; i < inputArray.length; i += 2) {
        // Take the current word.
        const firstWord = inputArray[i];
        
        // Take the next word. We use a conditional check to make sure it exists.
        // If there is no next word (i.e., the array has an odd number of elements),
        // nextWord will be undefined.
        const nextWord = inputArray[i + 1];

        // Check if a next word exists.
        if (nextWord) {
            // If it exists, combine the two words with a space.
            const combinedString = `${firstWord} ${nextWord}`;
            groupedArray.push(combinedString);
        } else {
            // If there's no next word, just add the last word to the array by itself.
            groupedArray.push(firstWord);
        }
    }

    return groupedArray;
}
