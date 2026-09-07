import { Outlet } from "react-router-dom"
import {
  Box,
  Toolbar
} from "@mui/material"

import ResponsiveAppBar from "../components/AppBar"


export default function MainLayout() {
  return (
    <Box sx={{ display: "flex", height: "100vh", overflow: "hidden" }}>

      <ResponsiveAppBar />

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden"
        }}
      >
        <Toolbar sx={{ minHeight: { md: 80 } }} />
        <Outlet />
      </Box>

    </Box>
  )
}