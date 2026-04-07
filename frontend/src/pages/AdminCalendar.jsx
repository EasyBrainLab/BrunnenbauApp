import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { apiGet } from '../api';

export default function AdminCalendar() {
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);

  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    try {
      const res = await apiGet('/api/admin/calendar/events');
      if (res.status === 401) {
        navigate('/admin');
        return;
      }
      if (res.ok) {
        setEvents(await res.json());
      }
    } catch {
      // ignore
    }
  };

  const handleEventClick = (info) => {
    const inquiryId = info.event.extendedProps.inquiry_id;
    if (inquiryId) {
      navigate(`/admin/anfrage/${inquiryId}`);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-primary-500">Kalender</h1>
          <p className="text-gray-500 text-sm">Besichtigungen, Bohrtermine und Kundentermine</p>
        </div>
      </div>

      <div className="card">
        <FullCalendar
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek',
          }}
          locale="de"
          events={events}
          eventClick={handleEventClick}
          height="auto"
          buttonText={{
            today: 'Heute',
            month: 'Monat',
            week: 'Woche',
          }}
          eventTimeFormat={{
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
          }}
        />
      </div>
    </div>
  );
}
