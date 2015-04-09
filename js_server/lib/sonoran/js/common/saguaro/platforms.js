// -*- javascript -*-

// This file lists unique platform identifiers
// This is a 15-bit number. Top most bit is reserved to inidicate simulation.
var MOTE_RUNNER_PLATFORMS = [
    {name:"ANY",          id:0x0000, info:"Unspecified"},
    {name:"IRIS",         id:0x0001, info:"Memsic Iris mote"},
    {name:"AVRRAVEN",     id:0x0003, info:"Atmel Raven development kit LCD module"},
    {name:"RZUSBSTICK",   id:0x0004, info:"Atmel Raven development kit USB stick"},
    {name:"NICTOR",       id:0x0005, info:"Nictor Mote Platform"},
    {name:"DUSTNETWORKS", id:0x0006, info:"Dust Networks / ucOS-II"},
    {name:"CORTEX",       id:0x0007, info:"ARM Cortex"},
    {name:"WASPMOTE",     id:0x0008, info:"Libelium Waspmote PRO"},
    {name:"MSP430",       id:0x0009, info:"MSP430"},
    {name:"JENNIC",       id:0x000A, info:"Jennic JN5148"},
    {name:"LOTUS",        id:0x000B, info:"Memsic Lotus (Cortex-M3/RF230)"},
    {name:"GNODE",        id:0x000C, info:"SOWNet G-Node (MSP430/CC1101)"},
    {name:"DECENT",       id:0x000D, info:"DecentLabs Node (MSP430/RF212)"},
    {name:"STM32",        id:0x000E, info:"Generic STM32/ARM Cortex M3"},
    {name:"BLIPPER",      id:0x000F, info:"STM32/ARM Semtech Blipper V2"},
    {name:"IMST",         id:0x0010, info:"STM32/ARM IMST"},
    {name:"NUCLEO",       id:0x0011, info:"STM32/ARM Nucleo"},
    {name:"PIC24",        id:0x0012, info:"MicroChip PIC24"},
];
