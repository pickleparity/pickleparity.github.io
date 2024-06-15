document.getElementById('playerForm').addEventListener('submit', function(event) {
    event.preventDefault();
    const playerName = document.getElementById('playerName').value;
    if (playerName) {
        addPlayer(playerName, 0); // Add catch-up player by default
        document.getElementById('playerName').value = '';
    }
});

document.getElementById('addRotationPlayerButton').addEventListener('click', function() {
    const playerName = document.getElementById('playerName').value;
    if (playerName) {
        addPlayerToRotation(playerName);
        document.getElementById('playerName').value = '';
    }
});

let players = [];
let gameHistory = [];
let currentGame = null;

function addPlayer(name, gamesPlayed) {
    let newPlayer = {
        name: name,
        gamesPlayed: gamesPlayed,
        paused: false,
        teammateCount: {}
    };

    players.forEach(player => {
        newPlayer.teammateCount[player.name] = 0;
        player.teammateCount[name] = 0;
    });

    players.push(newPlayer);
    renderPlayerList();
}

function addPlayerToRotation(name) {
    const minGamesPlayed = Math.min(...players.filter(player => !player.paused).map(player => player.gamesPlayed));
    addPlayer(name, minGamesPlayed);
}

function renderPlayerList() {
    const playerList = document.getElementById('playerList');
    playerList.innerHTML = '';
    players.forEach(player => {
        const li = document.createElement('li');
        li.innerHTML = `${player.name} - Games Played: ${player.gamesPlayed}`;

        if (player.paused) {
            const returnButton = document.createElement('button');
            returnButton.textContent = 'Return to Rotation';
            returnButton.className = 'pause-button';
            returnButton.addEventListener('click', () => returnToRotation(player.name));

            const catchUpButton = document.createElement('button');
            catchUpButton.textContent = 'Catch Up';
            catchUpButton.className = 'pause-button';
            catchUpButton.addEventListener('click', () => returnToCatchUp(player.name));

            li.appendChild(returnButton);
            li.appendChild(catchUpButton);
        } else {
            const pauseButton = document.createElement('button');
            pauseButton.textContent = 'Pause';
            pauseButton.className = 'pause-button';
            pauseButton.addEventListener('click', () => togglePause(player.name));

            li.appendChild(pauseButton);
        }

        playerList.appendChild(li);
    });

    // Display the total number of games played
    const totalGames = gameHistory.length;
    const totalGamesDiv = document.getElementById('totalGames');
    totalGamesDiv.textContent = `Total Games Played: ${totalGames}`;

    // Show or hide the additional player buttons based on the game history
    if (gameHistory.length > 0) {
        document.getElementById('addPlayerButton').style.display = 'none';
        document.getElementById('addCatchUpPlayerButton').style.display = 'inline-block';
        document.getElementById('addRotationPlayerButton').style.display = 'inline-block';
    } else {
        document.getElementById('addPlayerButton').style.display = 'inline-block';
        document.getElementById('addCatchUpPlayerButton').style.display = 'none';
        document.getElementById('addRotationPlayerButton').style.display = 'none';
    }
}

function togglePause(name) {
    const player = players.find(player => player.name === name);
    if (player) {
        player.paused = !player.paused;
        renderPlayerList();
    }
}

function returnToRotation(name) {
    const player = players.find(player => player.name === name);
    if (player) {
        const minGamesPlayed = Math.min(...players.filter(p => !p.paused && p.name !== name).map(p => p.gamesPlayed));
        player.gamesPlayed = minGamesPlayed;
        player.paused = false;
        renderPlayerList();
    }
}

function returnToCatchUp(name) {
    const player = players.find(player => player.name === name);
    if (player) {
        player.paused = false;
        renderPlayerList();
    }
}

document.getElementById('generateRotation').addEventListener('click', () => {
    acceptGame();  // Implicitly accept the current game before generating a new one
    generateRotation();
});
document.getElementById('rejectGame').addEventListener('click', rejectGame);

function generateRotation() {
    const rotationOutput = document.getElementById('rotationOutput');
    const activePlayers = players.filter(player => !player.paused);
    if (activePlayers.length < 4) {
        rotationOutput.textContent = 'Need at least 4 active players to create rotations.';
        return;
    }

    let selectedPlayers = selectPlayersForGame(activePlayers);
    if (!selectedPlayers) {
        rotationOutput.textContent = 'Unable to create a new game with different team combinations.';
        return;
    }

    currentGame = [
        selectedPlayers[0].name, selectedPlayers[1].name,
        selectedPlayers[2].name, selectedPlayers[3].name
    ];

    // Display current game
    rotationOutput.innerHTML = '';
    const div = document.createElement('div');
    div.innerHTML = `<h3>Current Game</h3><p>${currentGame[0]} and ${currentGame[1]} vs. ${currentGame[2]} and ${currentGame[3]}</p>`;
    rotationOutput.appendChild(div);

    // Show the reject button
    document.getElementById('rejectGame').style.display = 'inline-block';
}

function rejectGame() {
    // Generate a new rotation without adding the current game to history
    generateRotation();
}

function acceptGame() {
    if (currentGame) {
        // Update games played and teammates
        const selectedPlayers = players.filter(player => currentGame.includes(player.name));
        updatePlayerData(selectedPlayers);

        // Add to game history and render it
        gameHistory.push(currentGame);
        renderGameHistory();

        // Update player list to reflect the new number of games played
        renderPlayerList();

        currentGame = null;
        document.getElementById('rejectGame').style.display = 'none';
        document.getElementById('rotationOutput').innerHTML = '';
    }
}

function selectPlayersForGame(activePlayers) {
    // Sort players by the number of games played
    activePlayers.sort((a, b) => a.gamesPlayed - b.gamesPlayed);
    
    // Get the minimum number of games played by any active player
    const minGamesPlayed = activePlayers[0].gamesPlayed;

    // Get the subset of players who have played the minimum number of games
    const minGamePlayers = activePlayers.filter(player => player.gamesPlayed === minGamesPlayed);

    // Randomly select one player with the minimum number of games for player 0
    const player0 = minGamePlayers[Math.floor(Math.random() * minGamePlayers.length)];

    // Remove player 0 from the active players
    const remainingPlayers = activePlayers.filter(player => player !== player0);

    // Get the minimum number of games played by the remaining players
    const minGamesPlayedRemaining = remainingPlayers[0].gamesPlayed;

    // Get the subset of players who have played the minimum number of games, excluding player 0
    const minGamePlayersRemaining = remainingPlayers.filter(player => player.gamesPlayed === minGamesPlayedRemaining);

    // Randomly select another player with the minimum number of games for player 2
    const player2 = minGamePlayersRemaining[Math.floor(Math.random() * minGamePlayersRemaining.length)];

    let delta = 0;
    const maxDelta = 5;

    while (delta <= maxDelta) {
        // Get eligible teammates for player 0 within delta
        const eligibleTeammates0 = remainingPlayers.filter(player => player !== player2 && player.gamesPlayed <= player0.gamesPlayed + delta);

        // Get eligible teammates for player 2 within delta
        const eligibleTeammates2 = remainingPlayers.filter(player => player !== player0 && player !== player2 && player.gamesPlayed <= player2.gamesPlayed + delta);

        // Find a teammate for player 0
        const teammate0 = findTeammate(player0, eligibleTeammates0);

        // Find a teammate for player 2
        const teammate2 = findTeammate(player2, eligibleTeammates2.filter(player => player !== teammate0));

        // If we have found valid teammates, return the selected players
        if (teammate0 && teammate2) {
            return [player0, teammate0, player2, teammate2];
        }

        // Increment delta if no valid teams found
        delta++;
    }

    // Fallback to selecting 4 players without prioritization if no valid group was found
    return activePlayers.slice(0, 4);
}

function findTeammate(player, candidates) {
    // Sort candidates by the number of games played with the player, with a tiebreaker for total games played
    candidates.sort((a, b) => {
        const gamesWithPlayerA = player.teammateCount[a.name];
        const gamesWithPlayerB = player.teammateCount[b.name];
        if (gamesWithPlayerA === gamesWithPlayerB) {
            return a.gamesPlayed - b.gamesPlayed;
        }
        return gamesWithPlayerA - gamesWithPlayerB;
    });

    // Return the candidate with the minimum games played with the player
    return candidates.length > 0 ? candidates[0] : null;
}

function updatePlayerData(selectedPlayers) {
    selectedPlayers.forEach(player => {
        player.gamesPlayed++;
    });

    // Update teammate counts for Team 1
    selectedPlayers[0].teammateCount[selectedPlayers[1].name]++;
    selectedPlayers[1].teammateCount[selectedPlayers[0].name]++;

    // Update teammate counts for Team 2
    selectedPlayers[2].teammateCount[selectedPlayers[3].name]++;
    selectedPlayers[3].teammateCount[selectedPlayers[2].name]++;
}

function renderGameHistory() {
    const gameHistoryOutput = document.getElementById('gameHistory');
    gameHistoryOutput.innerHTML = '';
    for (let i = gameHistory.length - 1; i >= 0; i--) {
        const game = gameHistory[i];
        const div = document.createElement('div');
        div.innerHTML = `<h3>Game ${i + 1}</h3><p>${game[0]} and ${game[1]} vs. ${game[2]} and ${game[3]}</p>`;
        gameHistoryOutput.appendChild(div);
    }
}

function openTab(tabName) {
    var i, tabcontent, tablinks;
    tabcontent = document.getElementsByClassName("tab-content");
    for (i = 0; i < tabcontent.length; i++) {
        tabcontent[i].style.display = "none";
    }
    tablinks = document.getElementsByClassName("tab-button");
    for (i = 0; i < tablinks.length; i++) {
        tablinks[i].className = tablinks[i].className.replace(" active", "");
    }
    document.getElementById(tabName).style.display = "block";
    event.currentTarget.className += " active";
}

// Initialize by showing the setup tab
document.addEventListener('DOMContentLoaded', function() {
    openTab('setup');
});
