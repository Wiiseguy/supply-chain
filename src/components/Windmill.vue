<style>
#blades {
    /* Ensures the rotation is around the exact center of the blade assembly */
    transform-origin: 75px 65px;
    /* Fixed center point */
    animation-duration: 6s;
}
</style>
<template>
    <svg class="game-graphic" width="64" height="64" viewBox="0 0 150 150" xmlns="http://www.w3.org/2000/svg"
        transform="scale(0.8)">
        <!-- Windmill Base -->
        <path d="M45 150 L75 60 L105 150 Z" fill="#8B4513" /> <!-- Broader, triangular base -->
        <rect x="65" y="50" width="20" height="20" fill="#A0522D" transform="translate(0 0)" />

        <!-- Windmill Blades/Spokes -->
        <g transform="scale(0.8) translate(20 10) ">
            <g id="blades" :class="{ rotate: tile?.working }" transform="rotate(80)">
                <!-- Blade 1 -->
                <polygon points="75,60 55,0 95,0" fill="#B0C4DE" />
                <polygon points="75,60 55,0 95,0" fill="#B0C4DE" transform="rotate(90 75 65)" />
                <polygon points="75,60 55,0 95,0" fill="#B0C4DE" transform="rotate(180 75 65)" />
                <polygon points="75,60 55,0 95,0" fill="#B0C4DE" transform="rotate(270 75 65)" />
            </g>
        </g>
    </svg>
</template>
<script>
export default {
    props: ['tile'],
}
</script>
