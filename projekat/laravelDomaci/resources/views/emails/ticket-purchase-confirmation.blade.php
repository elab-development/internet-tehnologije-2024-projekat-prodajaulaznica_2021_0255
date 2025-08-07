<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Potvrda kupovine karte</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
        }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            text-align: center;
            border-radius: 10px 10px 0 0;
        }
        .content {
            background: white;
            padding: 30px;
            border: 1px solid #ddd;
            border-top: none;
        }
        .ticket-info {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
        }
        .event-details {
            background: #e3f2fd;
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
        }
        .qr-section {
            text-align: center;
            background: #fff3cd;
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
        }
        .footer {
            background: #f8f9fa;
            padding: 20px;
            text-align: center;
            border-radius: 0 0 10px 10px;
            font-size: 14px;
            color: #666;
        }
        .btn {
            display: inline-block;
            padding: 12px 24px;
            background: #007bff;
            color: white;
            text-decoration: none;
            border-radius: 5px;
            margin: 10px 0;
        }
        .price {
            font-size: 24px;
            font-weight: bold;
            color: #28a745;
        }
        .ticket-number {
            font-family: monospace;
            font-size: 18px;
            font-weight: bold;
            background: #e9ecef;
            padding: 10px;
            border-radius: 4px;
            letter-spacing: 2px;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>🎫 TicketMaster Pro</h1>
        <h2>Potvrda kupovine karte</h2>
    </div>


    <div class="content">
        <p>Poštovani/a {{ $user->name }},</p>
        
        <p>Hvala vam što ste kupili kartu preko naše platforme! Vaša karta je uspešno rezervisana.</p>


        <div class="ticket-info">
            <h3>📋 Informacije o karti</h3>
            <p><strong>Broj karte:</strong></p>
            <div class="ticket-number">{{ $ticket->ticket_number }}</div>
            
            <p><strong>Status:</strong> {{ ucfirst($ticket->status) }}</p>
            <p><strong>Cena:</strong> <span class="price">{{ number_format($ticket->price, 0, ',', '.') }} RSD</span></p>
            
            @if($ticket->discount_percentage > 0)
                <p><strong>Popust:</strong> {{ $ticket->discount_percentage }}% ({{ number_format($ticket->discount_amount, 0, ',', '.') }} RSD)</p>
                <p><strong>Originalna cena:</strong> {{ number_format($ticket->original_price, 0, ',', '.') }} RSD</p>
            @endif
            
            <p><strong>Datum kupovine:</strong> {{ $ticket->purchase_date->format('d.m.Y H:i') }}</p>
        </div>


        <div class="event-details">
            <h3>🎪 Detalji događaja</h3>
            <p><strong>Naziv:</strong> {{ $event->name }}</p>
            <p><strong>Datum i vreme:</strong> {{ $event->start_date->format('d.m.Y H:i') }}</p>
            <p><strong>Lokacija:</strong> {{ $event->location }}</p>
            <p><strong>Kategorija:</strong> {{ $event->category->name }}</p>
            
            @if($event->description)
                <p><strong>Opis:</strong> {{ Str::limit($event->description, 200) }}</p>
            @endif
        </div>


        <div class="qr-section">
            <h3>📱 QR kod za ulaz</h3>
            <p>Pokažite ovaj QR kod na ulazu u događaj:</p>
            
            @if($qrCodePath)
                <p><em>QR kod je priložen kao slika u ovom email-u.</em></p>
            @endif
            
            <p><strong>Napomena:</strong> QR kod možete pronaći i u vašem profilu na našoj platformi.</p>
        </div>


        <div style="text-align: center; margin: 30px 0;">
            <a href="{{ config('app.frontend_url', 'http://localhost:3000') }}/tickets" class="btn">
                Pogledaj moje karte
            </a>
        </div>


        <div style="background: #fff3cd; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h4>⚠️ Važne napomene:</h4>
            <ul>
                <li>Ponesitе važeći lični dokument</li>
                <li>Dođite 30 minuta pre početka događaja</li>
                <li>Karta se može otkazati do 24 sata pre događaja</li>
                <li>Zabranjeno je fotografisanje i snimanje bez dozvole</li>
            </ul>
        </div>
    </div>


    <div class="footer">
        <p><strong>TicketMaster Pro</strong></p>
        <p>Knez Mihailova 42, Beograd | +381 11 123 4567</p>
        <p>podrska@ticketmaster.rs | www.ticketmaster.rs</p>
        <p style="margin-top: 20px; font-size: 12px;">
            Ovaj email je automatski generisan. Molimo ne odgovarajte na njega.
        </p>
    </div>
</body>
</html>
