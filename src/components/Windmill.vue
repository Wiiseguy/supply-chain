<template>
    <svg class="game-graphic" width="100" height="150" viewBox="0 0 100 150" xmlns="http://www.w3.org/2000/svg">
        <!-- Windmill Base -->
        <path d="M 30 150 L 50 80 L 70 150 Z" fill="#8b4513" /> <!-- Broader, triangular base -->
        <rect x="40" y="70" width="20" height="20" fill="#a0522d" />

        <!-- Windmill Blades/Spokes -->
        <g id="blades" transform="rotate(0,50,80)">
            <!-- Blade 1 -->
            <polygon points="50,80 40,30 60,30" fill="#b0c4de" />
            <!-- Blade 2 -->
            <polygon points="50,80 100,70 100,90" fill="#b0c4de" />
            <!-- Blade 3 -->
            <polygon points="50,80 40,130 60,130" fill="#b0c4de" />
            <!-- Blade 4 -->
            <polygon points="50,80 0,90 0,70" fill="#b0c4de" />
        </g>
    </svg>
</template>
