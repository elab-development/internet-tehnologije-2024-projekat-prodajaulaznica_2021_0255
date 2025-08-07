<?php
// Create app/Http/Controllers/Api/ExportController.php


namespace App\Http\Controllers\Api;


use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use App\Models\Event;
use App\Models\Ticket;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Facades\Response;


class ExportController extends Controller
{
    public function exportEvents(Request $request)
    {
        $format = $request->get('format', 'csv');
        $events = Event::with(['category'])->get();


        if ($format === 'csv') {
            return $this->exportEventsCSV($events);
        } else {
            return $this->exportEventsPDF($events);
        }
    }


    public function exportTickets(Request $request)
    {
        $format = $request->get('format', 'csv');
        $eventId = $request->get('event_id');
        
        $query = Ticket::with(['event', 'user']);
        
        if ($eventId) {
            $query->where('event_id', $eventId);
        }
        
        $tickets = $query->get();


        if ($format === 'csv') {
            return $this->exportTicketsCSV($tickets);
        } else {
            return $this->exportTicketsPDF($tickets);
        }
    }


    private function exportEventsCSV($events)
    {
        $csvData = "ID,Naziv,Kategorija,Datum pocetka,Datum zavrsetka,Lokacija,Cena,Ukupno karata,Dostupno karata,Status\n";
        
        foreach ($events as $event) {
            $status = $event->end_date > now() ? 'Aktivan' : 'Zavrsen';
            $csvData .= sprintf(
                "%d,\"%s\",\"%s\",\"%s\",\"%s\",\"%s\",%.2f,%d,%d,\"%s\"\n",
                $event->id,
                str_replace('"', '""', $event->name),
                str_replace('"', '""', $event->category->name),
                $event->start_date->format('d.m.Y H:i'),
                $event->end_date->format('d.m.Y H:i'),
                str_replace('"', '""', $event->location),
                $event->price,
                $event->total_tickets,
                $event->available_tickets,
                $status
            );
        }


        return Response::make($csvData, 200, [
            'Content-Type' => 'text/csv',
            'Content-Disposition' => 'attachment; filename="events_' . date('Y-m-d') . '.csv"',
        ]);
    }


    private function exportTicketsCSV($tickets)
    {
        $csvData = "ID,Broj karte,Dogadjaj,Korisnik,Email,Cena,Status,Datum kupovine,Datum koriscenja\n";
        
        foreach ($tickets as $ticket) {
            $csvData .= sprintf(
                "%d,\"%s\",\"%s\",\"%s\",\"%s\",%.2f,\"%s\",\"%s\",\"%s\"\n",
                $ticket->id,
                $ticket->ticket_number,
                str_replace('"', '""', $ticket->event->name),
                str_replace('"', '""', $ticket->user->name),
                $ticket->user->email,
                $ticket->price,
                ucfirst($ticket->status),
                $ticket->purchase_date ? $ticket->purchase_date->format('d.m.Y H:i') : '',
                $ticket->used_at ? $ticket->used_at->format('d.m.Y H:i') : ''
            );
        }


        return Response::make($csvData, 200, [
            'Content-Type' => 'text/csv',
            'Content-Disposition' => 'attachment; filename="tickets_' . date('Y-m-d') . '.csv"',
        ]);
    }


    private function exportEventsPDF($events)
    {
        // Simple HTML to PDF conversion
        $html = $this->generateEventsHTML($events);
        
        return Response::make($html, 200, [
            'Content-Type' => 'text/html',
            'Content-Disposition' => 'attachment; filename="events_' . date('Y-m-d') . '.html"',
        ]);
    }


    private function generateEventsHTML($events)
    {
        $html = '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Izvoz događaja</title>';
        $html .= '<style>body{font-family:Arial,sans-serif;margin:20px;}table{width:100%;border-collapse:collapse;}th,td{border:1px solid #ddd;padding:8px;text-align:left;}th{background-color:#f2f2f2;}</style>';
        $html .= '</head><body>';
        $html .= '<h1>Izvoz događaja - ' . date('d.m.Y') . '</h1>';
        $html .= '<table><thead><tr><th>ID</th><th>Naziv</th><th>Kategorija</th><th>Datum početka</th><th>Lokacija</th><th>Cena</th><th>Karte</th><th>Status</th></tr></thead><tbody>';
        
        foreach ($events as $event) {
            $status = $event->end_date > now() ? 'Aktivan' : 'Završen';
            $html .= '<tr>';
            $html .= '<td>' . $event->id . '</td>';
            $html .= '<td>' . htmlspecialchars($event->name) . '</td>';
            $html .= '<td>' . htmlspecialchars($event->category->name) . '</td>';
            $html .= '<td>' . $event->start_date->format('d.m.Y H:i') . '</td>';
            $html .= '<td>' . htmlspecialchars($event->location) . '</td>';
            $html .= '<td>' . number_format($event->price, 0, ',', '.') . ' RSD</td>';
            $html .= '<td>' . $event->available_tickets . '/' . $event->total_tickets . '</td>';
            $html .= '<td>' . $status . '</td>';
            $html .= '</tr>';
        }
        
        $html .= '</tbody></table></body></html>';
        return $html;
    }
}
