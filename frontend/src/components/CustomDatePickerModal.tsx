import { useEffect, useMemo, useRef, useState } from "react"

import dayjs, {
    Dayjs
} from "dayjs"

import "dayjs/locale/es"

import {
    Box,
    Typography,
    Paper,
    Button
} from "@mui/material"

import CalendarMonthIcon
    from "@mui/icons-material/CalendarMonth"

import ChevronLeftIcon
    from "@mui/icons-material/ChevronLeft"

import ChevronRightIcon
    from "@mui/icons-material/ChevronRight"

dayjs.locale("es")

type Props = {
    startDate: Dayjs | null
    endDate: Dayjs | null

    setStartDate: (
        value: Dayjs | null
    ) => void

    setEndDate: (
        value: Dayjs | null
    ) => void
}

const weekDays = [
    "L",
    "M",
    "X",
    "J",
    "V",
    "S",
    "D"
]

export default function CustomDateRangePicker({
    startDate,
    endDate,

    setStartDate,
    setEndDate
}: Props) {

    const [open, setOpen] =
        useState(false)

    // alto máximo del popover = espacio real debajo del botón (no se sale del viewport)
    const [maxH, setMaxH] =
        useState<number | undefined>(undefined)

    const containerRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (!open) return
        function handleClickOutside(e: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setOpen(false)
                setSelectingEnd(false)
            }
        }
        document.addEventListener("mousedown", handleClickOutside)
        return () => document.removeEventListener("mousedown", handleClickOutside)
    }, [open])

    useEffect(() => {
        if (!open) return
        const calc = () => {
            const el = containerRef.current
            if (!el) return
            // el popover abre con top: 60 respecto del contenedor (el botón)
            const top = el.getBoundingClientRect().top + 60
            setMaxH(Math.max(300, window.innerHeight - top - 16))
        }
        calc()
        window.addEventListener("resize", calc)
        return () => window.removeEventListener("resize", calc)
    }, [open])

    const [currentMonth, setCurrentMonth] =
        useState(dayjs())

    const [
        selectingEnd,
        setSelectingEnd
    ] = useState(false)

    const displayValue =
        useMemo(() => {

            if (
                !startDate ||
                !endDate
            ) return "Elegir período"

            return `${startDate.format("DD/MM/YYYY")} - ${endDate.format("DD/MM/YYYY")}`

        }, [
            startDate,
            endDate
        ])

    // DAYS — semanas de lunes a domingo, sin filas de más
    const days =
        useMemo(() => {

            const monthStart =
                currentMonth.startOf("month")

            const monthEnd =
                currentMonth.endOf("month")

            // .day() → 0=domingo … 6=sábado; lo convertimos a lunes=0 … domingo=6
            const startOffset =
                (monthStart.day() + 6) % 7

            const endOffset =
                6 - ((monthEnd.day() + 6) % 7)

            const gridStart =
                monthStart.subtract(startOffset, "day")

            const gridEnd =
                monthEnd.add(endOffset, "day")

            const array = []

            let day = gridStart

            while (
                day.isBefore(gridEnd) ||
                day.isSame(gridEnd, "day")
            ) {

                array.push(day)

                day = day.add(1, "day")

            }

            return array

        }, [currentMonth])

    // RANGE
    const isInRange = (
        day: Dayjs
    ) => {

        if (
            !startDate ||
            !endDate
        ) return false

        return (
            day.isAfter(
                startDate,
                "day"
            ) &&
            day.isBefore(
                endDate,
                "day"
            )
        )

    }

    // SELECT DAY
    const handleSelectDay = (
        day: Dayjs
    ) => {

        // START
        if (
            !startDate ||
            !selectingEnd
        ) {

            setStartDate(day)
            setEndDate(null)

            setSelectingEnd(true)

            return

        }

        // END
        if (
            day.isBefore(startDate)
        ) {

            setEndDate(startDate)
            setStartDate(day)

        } else {

            setEndDate(day)

        }

        setSelectingEnd(false)

    }

    // PRESETS
    const applyPreset = (
        type: string
    ) => {

        const today = dayjs()

        switch (type) {

            case "thisWeek":

                setStartDate(
                    today.startOf("week")
                )

                setEndDate(
                    today.endOf("week")
                )

                break

            case "lastWeek":

                setStartDate(
                    today
                        .subtract(1, "week")
                        .startOf("week")
                )

                setEndDate(
                    today
                        .subtract(1, "week")
                        .endOf("week")
                )

                break

            case "last7":

                setStartDate(
                    today.subtract(6, "day")
                )

                setEndDate(today)

                break

            case "currentMonth":

                setStartDate(
                    today.startOf("month")
                )

                setEndDate(
                    today.endOf("month")
                )

                break

            case "lastMonth":

                setStartDate(
                    today
                        .subtract(1, "month")
                        .startOf("month")
                )

                setEndDate(
                    today
                        .subtract(1, "month")
                        .endOf("month")
                )

                break

            case "reset":

                setStartDate(null)
                setEndDate(null)

                break

        }

    }

    return (
        <Box ref={containerRef} sx={{ position: "relative" }}>

            {/* OPEN BUTTON */}
            <Button
                variant="outlined"
                startIcon={
                    <CalendarMonthIcon />
                }
                onClick={() =>
                    setOpen(true)
                }
            >

                {displayValue}

            </Button>

            {/* MODAL */}
            {open && (

                <Paper
                    elevation={8}
                    sx={{
                        position: "absolute",

                        top: 60,

                        left: 0,

                        zIndex: 9999,

                        display: "flex",

                        flexDirection: { xs: "column", sm: "row" },

                        width: "auto",

                        maxWidth: "min(620px, 92vw)",

                        maxHeight: maxH,

                        overflowY: "auto",

                        borderRadius: "20px",

                        backgroundColor:
                            "#F7F1EA"
                    }}
                >

                    {/* SIDEBAR */}
                    <Box
                        sx={{
                            width: { xs: "100%", sm: 170 },

                            flexShrink: 0,

                            p: { xs: 2, sm: 3 },

                            display: "flex",

                            flexDirection: {
                                xs: "row",
                                sm: "column"
                            },

                            flexWrap: { xs: "wrap", sm: "nowrap" },

                            justifyContent:
                                "center",

                            alignItems:
                                "stretch",

                            gap: 1,

                            borderRight: {
                                xs: "none",
                                sm: "1px solid #E6DED3"
                            },

                            borderBottom: {
                                xs: "1px solid #E6DED3",
                                sm: "none"
                            }
                        }}
                    >

                        <Button
                            sx={{
                                whiteSpace: "nowrap",
                                justifyContent: "flex-start"
                            }}
                            onClick={() =>
                                applyPreset(
                                    "thisWeek"
                                )
                            }
                        >
                            Esta semana
                        </Button>

                        <Button
                            sx={{
                                whiteSpace: "nowrap",
                                justifyContent: "flex-start"
                            }}
                            onClick={() =>
                                applyPreset(
                                    "lastWeek"
                                )
                            }
                        >
                            Semana pasada
                        </Button>

                        <Button
                            sx={{
                                whiteSpace: "nowrap",
                                justifyContent: "flex-start"
                            }}
                            onClick={() =>
                                applyPreset(
                                    "last7"
                                )
                            }
                        >
                            Últimos 7 días
                        </Button>

                        <Button
                            sx={{
                                whiteSpace: "nowrap",
                                justifyContent: "flex-start"
                            }}
                            onClick={() =>
                                applyPreset(
                                    "currentMonth"
                                )
                            }
                        >
                            Mes actual
                        </Button>

                        <Button
                            sx={{
                                whiteSpace: "nowrap",
                                justifyContent: "flex-start"
                            }}
                            onClick={() =>
                                applyPreset(
                                    "lastMonth"
                                )
                            }
                        >
                            Mes pasado
                        </Button>

                        <Button
                            sx={{
                                whiteSpace: "nowrap",
                                justifyContent: "flex-start"
                            }}
                            onClick={() =>
                                applyPreset(
                                    "reset"
                                )
                            }
                        >
                            Reset
                        </Button>

                    </Box>

                    {/* CALENDAR */}
                    <Box
                        sx={{
                            p: { xs: 2, sm: 3 },
                            width: { xs: "100%", sm: 420 },
                            maxWidth: "100%",
                            boxSizing: "border-box"
                        }}
                    >

                        {/* HEADER */}
                        <Box
                            sx={{
                                display: "flex",
                                justifyContent:
                                    "space-between",
                                alignItems: "center",
                                mb: { xs: 2, sm: 2.5 }
                            }}
                        >

                            <Typography
                                sx={{
                                    fontWeight: 700,
                                    fontSize: { xs: "1.25rem", sm: "2rem" },
                                    textTransform:
                                        "capitalize"
                                }}
                            >
                                {currentMonth.format(
                                    "MMMM YYYY"
                                )}
                            </Typography>

                            <Box
                                sx={{
                                    display: "flex",
                                    gap: 1
                                }}
                            >

                                <Button
                                    onClick={() =>
                                        setCurrentMonth(
                                            currentMonth.subtract(
                                                1,
                                                "month"
                                            )
                                        )
                                    }
                                    sx={{
                                        minWidth: 40
                                    }}
                                >
                                    <ChevronLeftIcon />
                                </Button>

                                <Button
                                    onClick={() =>
                                        setCurrentMonth(
                                            currentMonth.add(
                                                1,
                                                "month"
                                            )
                                        )
                                    }
                                    sx={{
                                        minWidth: 40
                                    }}
                                >
                                    <ChevronRightIcon />
                                </Button>

                            </Box>

                        </Box>

                        {/* WEEK DAYS */}
                        <Box
                            sx={{
                                display: "grid",
                                gridTemplateColumns:
                                    "repeat(7, 1fr)",
                                mb: 2
                            }}
                        >

                            {weekDays.map((day) => (

                                <Box
                                    key={day}
                                    sx={{
                                        textAlign:
                                            "center",

                                        py: 0.5,

                                        fontWeight: 700,

                                        color:
                                            "#8A5A44"
                                    }}
                                >
                                    {day}
                                </Box>

                            ))}

                        </Box>

                        {/* DAYS */}
                        <Box
                            sx={{
                                display: "grid",

                                gridTemplateColumns:
                                    "repeat(7, 1fr)",

                                gap: 0.5
                            }}
                        >

                            {days.map((day) => {

                                const isSelected =
                                    day.isSame(
                                        startDate,
                                        "day"
                                    ) ||
                                    day.isSame(
                                        endDate,
                                        "day"
                                    )

                                const inRange =
                                    isInRange(day)

                                const outsideMonth =
                                    !day.isSame(
                                        currentMonth,
                                        "month"
                                    )

                                return (

                                    <Box
                                        key={day.toString()}
                                        onClick={() =>
                                            handleSelectDay(
                                                day
                                            )
                                        }
                                        sx={{

                                            width: { xs: 34, sm: 40 },

                                            height: { xs: 34, sm: 40 },

                                            mx: "auto",

                                            display: "flex",

                                            alignItems:
                                                "center",

                                            justifyContent:
                                                "center",

                                            borderRadius:
                                                isSelected
                                                    ? "50%"
                                                    : inRange
                                                        ? "18px"
                                                        : "50%",

                                            backgroundColor:
                                                isSelected
                                                    ? "#D0824F"
                                                    : inRange
                                                        ? "#E4D6C9"
                                                        : "transparent",

                                            color:
                                                outsideMonth
                                                    ? "#B9B1A7"
                                                    : isSelected
                                                        ? "white"
                                                        : "#5C4033",

                                            cursor: "pointer",

                                            fontWeight:
                                                isSelected
                                                    ? 700
                                                    : 500,

                                            fontSize:
                                                { xs: "0.85rem", sm: "1rem" },

                                            transition:
                                                "0.2s",

                                            "&:hover": {

                                                backgroundColor:
                                                    isSelected
                                                        ? "#D0824F"
                                                        : "#EFE3D8"

                                            }

                                        }}
                                    >

                                        {day.date()}

                                    </Box>

                                )

                            })}

                        </Box>

                        {/* FOOTER */}
                        <Box
                            sx={{
                                mt: { xs: 2, sm: 3 },

                                display: "flex",

                                flexDirection: { xs: "column", sm: "row" },

                                gap: { xs: 1.5, sm: 0 },

                                justifyContent:
                                    "space-between",

                                alignItems: { xs: "stretch", sm: "center" }
                            }}
                        >

                            <Typography
                                sx={{
                                    fontWeight: 600,
                                    fontSize: { xs: "0.8rem", sm: "0.9rem" },
                                    whiteSpace: "nowrap"
                                }}
                            >

                                {displayValue}

                            </Typography>

                            <Box
                                sx={{
                                    display: "flex",
                                    gap: 1,
                                    flexShrink: 0
                                }}
                            >

                                <Button
                                    size="small"
                                    onClick={() =>
                                        setOpen(false)
                                    }
                                >
                                    Cancelar
                                </Button>

                                <Button
                                    size="small"
                                    variant="contained"
                                    onClick={() => {

                                        setOpen(false)
                                        setSelectingEnd(false)

                                    }}
                                    sx={{
                                        px: 2.5,
                                        py: 0.8
                                    }}
                                >
                                    Aplicar
                                </Button>

                            </Box>

                        </Box>

                    </Box>

                </Paper>

            )}

        </Box>
    )
}